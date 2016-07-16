cc.GLNode = cc.GLNode || cc.Node.extend({
        ctor: function () {
            this._super();
            this.init();
        },
        init: function () {
            this._renderCmd._needDraw = true;
            this._renderCmd.rendering = function (ctx) {
                cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW);
                cc.kmGLPushMatrix();
                cc.kmGLLoadMatrix(this._stackMatrix);

                this._node.draw(ctx);

                cc.kmGLPopMatrix();
            };
        },
        draw: function (ctx) {
            this._super(ctx);
        }
    });

var GRABABLE_MASK_BIT = 1<<31;
var NOT_GRABABLE_MASK = ~GRABABLE_MASK_BIT;

var HelloWorldLayer = cc.Layer.extend({
    // 对象成员
    sprite: null,
    kMaxHillKeyPoints: 1000,
    _hillKeyPoints: new Array(),
    _offsetX: 0,
    _fromKeyPointI: 0,
    _toKeyPointI: 0,
    kHillSegmentWidth: 10,
    M_PI: 3.14159265358979323846,

    prevFromKeyPointI: -1,
    prevToKeyPointI:  -1,

    kMaxHillVertices: 4000,
    kMaxBorderVertices: 800,

    _nHillVertices: 0,
    _hillVertices: new Float32Array(4000),
    _hillTexCoords: new Float32Array(4000),
    _hillVerticesGL: gl.createBuffer(),
    _hillTexCoordsGL: gl.createBuffer(),
    _nBorderVertices: 0,
    _borderVertices: new Array(),
    _texture2d: null,

    _space: null,
    _debugNode: null,
    _hero: null,
    //
    resetTerrain : function() {
        var space = this._space;
        var shapeList = [];
        if(this.terrainBody)
        {
            this.terrainBody.eachShape(function(shapeObj){ shapeList.push(shapeObj);  })
            for(var i = 0, len = shapeList.length; i < len; i++)
            {
                space.removeStaticShape(shapeList[i]);
            }
        }

        this.terrainBody = new cp.Body(Infinity, Infinity);
        this.terrainBody.nodeIdleTime = Infinity;

        var p1 = cp.v(0, 0);
        var p2 = cp.v(0, 0);
        for(var i = 0; i < this._nBorderVertices - 1; i++) {
            p1.x = this._borderVertices[i].x;
            p1.y = this._borderVertices[i].y;
            p2.x = this._borderVertices[i + 1].x;
            p2.y = this._borderVertices[i + 1].y;
            var floor = space.addStaticShape(new cp.SegmentShape(this.terrainBody, p1, p2, 0));
            floor.setElasticity(1);
            floor.setFriction(1);
            floor.setLayers(NOT_GRABABLE_MASK);
        }
    },

    //
    ctor: function () {
        this._super();

        // 物理
        this._space = new cp.Space();
        this._space.gravity = cp.v(0, -100);
        this._space.sleepTimeThreshold = 0.5;
        this._space.collisionSlop = 0.5;

        //this._debugNode = new cc.PhysicsDebugNode(this._space);
        //this._debugNode.visible = false;
        //this.addChild(this._debugNode, 12);

        var width = 50;
        var height = 60;
        var mass = width * height * 1/1000;
        // var rock = this._space.addBody(new cp.Body(mass, cp.momentForBox(mass, width, height)));
        // rock.setPos(cp.v(500, 100));
        // rock.setAngle(1);
        // shape = this._space.addShape(new cp.BoxShape(rock, width, height));
        // shape.setFriction(0.3);
        // shape.setElasticity(0.3);

        // for (var i = 1; i <= 10; i++) {
        //     var radius = 20;
        //     mass = 3;
        //     var body = this._space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0, 0))));
        //     body.setPos(cp.v(200 + i, (2 * radius + 5) * i));
        //     var circle = this._space.addShape(new cp.CircleShape(body, radius, cp.v(0, 0)));
        //     circle.setElasticity(0.8);
        //     circle.setFriction(1);
        // }

        // 英雄
        this._hero = Hero.createWithSpace(this._space);
        this.addChild(this._hero, 12);

        // 纹理
        this._texture2d = cc.textureCache.addImage("res/test.png");

        // 线段
        this.generateHills();
        this.resetHillVertices();

        var draw = new cc.DrawNode();
        this.addChild(draw, 11);
        var winSize = cc.director.getWinSize();
        //for (var i = 1; i < this.kMaxHillKeyPoints; ++i) {
        for (var i = Math.max(this._fromKeyPointI, 1); i <= this._toKeyPointI; ++i) {
            // draw.drawSegment(this._hillKeyPoints[i - 1], this._hillKeyPoints[i], 1, cc.color(255, 255, 255, 255));
            // 绘制曲线
            var p0 = this._hillKeyPoints[i - 1];
            var p1 = this._hillKeyPoints[i];
            var hSegments = Math.floor((p1.x - p0.x) / this.kHillSegmentWidth);
            var dx = (p1.x - p0.x) / hSegments;
            var da = this.M_PI / hSegments;
            // 求两点的中点，基于0坐标
            var ymid = (p0.y + p1.y) / 2;
            // 
            var ampl = (p0.y - p1.y) / 2;

            var pt0 = {x: p0.x, y: p0.y};
            var pt1 = {x: 0, y: 0};
            for (var j = 0; j < hSegments + 1; ++j) {
                pt1.x = p0.x + j * dx;
                pt1.y = ymid + ampl * Math.cos(da * j);

                draw.drawSegment(pt0, pt1, 1, cc.color(255, 255, 255, 255));

                // 注意，不要pt0 = pt1，这样做，pt0是pt1的引用
                pt0.x = pt1.x;
                pt0.y = pt1.y;
            }
        }

        // 三角形
        if ('opengl' in cc.sys.capabilities) {
            var glnode = new cc.GLNode();
            this.addChild(glnode, 10);
            this.glnode = glnode;

            this.shader = cc.shaderCache.getProgram("ShaderPositionTexture");
            this.initBuffers();
            cc.glEnableVertexAttribs(cc.VERTEX_ATTRIB_FLAG_POSITION | cc.VERTEX_ATTRIB_FLAG_TEX_COORDS);

            glnode.draw = function () {
                this.shader.use();
                this.shader.setUniformsForBuiltins();

                this._texture2d.setTexParameters(gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
                cc.glBindTexture2D(this._texture2d);

                // 绘制山丘
                cc.glBindTexture2D(this._texture2d);

                gl.bindBuffer(gl.ARRAY_BUFFER, this._hillVerticesGL);
                gl.vertexAttribPointer(cc.VERTEX_ATTRIB_POSITION, 2, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, this._hillTexCoordsGL);
                gl.vertexAttribPointer(cc.VERTEX_ATTRIB_TEX_COORDS, 2, gl.FLOAT, false, 0, 0);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, this._nHillVertices / 2);

                //// Draw fullscreen Square
                //gl.bindBuffer(gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
                //gl.vertexAttribPointer(cc.VERTEX_ATTRIB_POSITION, 2, gl.FLOAT, false, 0, 0);
                //
                ////gl.bindBuffer(gl.ARRAY_BUFFER, this.squareVertexColorBuffer);
                ////gl.vertexAttribPointer(cc.VERTEX_ATTRIB_COLOR, 4, gl.FLOAT, false, 0, 0);
                //
                //gl.bindBuffer(gl.ARRAY_BUFFER, this.squareVertexTexBuffer);
                //gl.vertexAttribPointer(cc.VERTEX_ATTRIB_TEX_COORDS, 2, gl.FLOAT, false, 0, 0);
                //
                //gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                //// Draw fullscreen Triangle
                //gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
                //gl.vertexAttribPointer(cc.VERTEX_ATTRIB_POSITION, 2, gl.FLOAT, false, 0, 0);
                //
                //gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexColorBuffer);
                //gl.vertexAttribPointer(cc.VERTEX_ATTRIB_COLOR, 4, gl.FLOAT, false, 0, 0);
                //
                //gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexTexBuffer);
                //gl.vertexAttribPointer(cc.VERTEX_ATTRIB_TEX_COORDS, 2, gl.FLOAT, false, 0, 0);
                //
                //gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);

                //gl.bindBuffer(gl.ARRAY_BUFFER, null);

            }.bind(this);

        }

        return true;
    },

    onEnter : function () {
        this._super();

        if( 'touches' in cc.sys.capabilities )
        {
            cc.eventManager.addListener({
                event: cc.EventListener.TOUCH_ALL_AT_ONCE,
                onTouchesEnded: function(touches, event)
                {
                    console.log("点了一下。")
                }}, this);
        }
        else if( 'mouse' in cc.sys.capabilities )
        {
            var selfSpace = this._space
            var hero = this._hero

            cc.eventManager.addListener({
                event: cc.EventListener.MOUSE,
                onMouseDown: function (event)
                {
                    //var width = 50;
                    //var height = 60;
                    //var mass = width * height * 1/1000;
                    //
                    //var rock = selfSpace.addBody(new cp.Body(mass, cp.momentForBox(mass, width, height)));
                    // rock.setPos(cp.v(event._x, event._y));
                    // rock.setAngle(1);
                    // var shape = selfSpace.addShape(new cp.BoxShape(rock, width, height));
                    // shape.setFriction(0.3);
                    // shape.setElasticity(0.3);
                }
            }, this);
        }
    },

    generateHills: function () {
        var winSize = cc.director.getWinSize();

        var minDX = 160;
        var minDY = 60;
        var rangeDX = 80;
        var rangeDY = 40;
        var x = -minDX;
        var y = winSize.height / 2;

        var dy, ny;
        var sign = 1; // +1 - going up, -1 - going  down
        var paddingTop = 20;
        var paddingBottom = 20;

        for (var i = 0; i < this.kMaxHillKeyPoints; ++i) {
            this._hillKeyPoints[i] = cc.p(x, y);
            if (i == 0) {
                x = 0;
                y = winSize.height / 2;
            }
            else {
                x += Math.random() * rangeDX + minDX;
                while (true) {
                    dy = Math.random() * rangeDY + minDY;
                    ny = y + dy * sign;
                    if (ny < winSize.height - paddingTop && ny > paddingBottom) {
                        break;
                    }
                }
                y = ny;
            }
            sign *= -1;
        }
    },

    resetHillVertices: function () {
        var winSize = cc.director.getWinSize();

        // key points interval for drawing
        while (this._hillKeyPoints[this._fromKeyPointI + 1].x < this._offsetX - winSize.width / 8 / this.getScale()) {
            this._fromKeyPointI++;
        }
        while (this._hillKeyPoints[this._toKeyPointI].x < this._offsetX + winSize.width * 9 / 8 / this.getScale()) {
            this._toKeyPointI++;
        }

        //
        if (this.prevFromKeyPointI != this._fromKeyPointI || this.prevToKeyPointI != this._toKeyPointI)
        {
            // vertices for visible area
            this._nHillVertices = 0;
            this._nBorderVertices = 0;
            var p0 = cc.p();
            var p1 = cc.p();
            var pt0 = cc.p();
            var pt1 = cc.p();
            p0.x = this._hillKeyPoints[this._fromKeyPointI].x;
            p0.y = this._hillKeyPoints[this._fromKeyPointI].y;
            for (var i = this._fromKeyPointI + 1; i < this._toKeyPointI + 1; ++i)
            {
                p1.x = this._hillKeyPoints[i].x;
                p1.y = this._hillKeyPoints[i].y;

                // triangle strip between p0 and p1
                var hSegments = Math.floor((p1.x - p0.x) / this.kHillSegmentWidth);
                var dx = (p1.x - p0.x) / hSegments;
                var da = Math.PI / hSegments;
                var ymid = (p0.y + p1.y) / 2;
                var ampl = (p0.y - p1.y) / 2;
                pt0.x = p0.x;
                pt0.y = p0.y;
                this._borderVertices[this._nBorderVertices++] = cc.p(pt0.x, pt0.y);
                for (var j = 1; j < hSegments + 1; ++j)
                {
                    pt1.x = p0.x + j * dx;
                    pt1.y = ymid + ampl * Math.cos(da * j);
                    this._borderVertices[this._nBorderVertices++] = cc.p(pt1.x, pt1.y);

                    this._hillVertices[this._nHillVertices] = pt0.x;
                    this._hillVertices[this._nHillVertices + 1] = 0;
                    this._hillTexCoords[this._nHillVertices] = pt0.x / 512;
                    this._hillTexCoords[this._nHillVertices + 1] = 1.0;
                    this._nHillVertices += 2;

                    this._hillVertices[this._nHillVertices] = pt1.x;
                    this._hillVertices[this._nHillVertices + 1] = 0;
                    this._hillTexCoords[this._nHillVertices] = pt1.x / 512;
                    this._hillTexCoords[this._nHillVertices + 1] = 1.0;
                    this._nHillVertices += 2;

                    this._hillVertices[this._nHillVertices] = pt0.x;
                    this._hillVertices[this._nHillVertices + 1] = pt0.y;
                    this._hillTexCoords[this._nHillVertices] = pt0.x / 512;
                    this._hillTexCoords[this._nHillVertices + 1] = 0;
                    this._nHillVertices += 2;

                    this._hillVertices[this._nHillVertices] = pt1.x;
                    this._hillVertices[this._nHillVertices + 1] = pt1.y;
                    this._hillTexCoords[this._nHillVertices] = pt1.x / 512;
                    this._hillTexCoords[this._nHillVertices + 1] = 0;
                    this._nHillVertices += 2;

                    pt0.x = pt1.x;
                    pt0.y = pt1.y;
                }

                p0.x = p1.x;
                p0.y = p1.y;
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this._hillVerticesGL);
            gl.bufferData(gl.ARRAY_BUFFER, this._hillVertices, gl.DYNAMIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._hillTexCoordsGL);
            gl.bufferData(gl.ARRAY_BUFFER, this._hillTexCoords, gl.DYNAMIC_DRAW);

            //gl.bindBuffer(gl.ARRAY_BUFFER, null);

            this.prevFromKeyPointI = this._fromKeyPointI;
            this.prevToKeyPointI = this._toKeyPointI;

            this.resetTerrain()
        }
    },

    setOffsetX: function (newOffsetX) {
        var winSize = cc.director.getWinSize();

        this._offsetX = newOffsetX;
        this.setPosition(cc.p(winSize.width / 8 - this._offsetX * this.getScale(), 0));

        this.resetHillVertices();
    },

    initBuffers: function () {
        //
        // Triangle
        //
        var winSize = cc.director.getWinSize();
        var triangleVertexPositionBuffer = this.triangleVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
        var vertices = [
            winSize.width / 2, winSize.height,
            0, 0,
            winSize.width, 0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        var triangleVertexColorBuffer = this.triangleVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
        var colors = [
            1.0, 0.0, 0.0, 1.0,
            1.0, 0.0, 0.0, 1.0,
            1.0, 0.0, 0.0, 1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        var triangleVertexTexBuffer = this.triangleVertexTexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexTexBuffer);
        var textures = [
            0.5, 1,
            0, 0,
            1, 0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STATIC_DRAW);

        //
        // Square
        //
        var squareVertexPositionBuffer = this.squareVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        vertices = [
            0, winSize.height,
            0, 0,
            winSize.width, winSize.height,
            winSize.width, 0,
            //winSize.width, winSize.height,
            //0, winSize.height,
            //winSize.width, 0,
            //0, 0
        ];
        var _vertices = new Float32Array(100)
        _vertices[0] = 0;
        _vertices[1] = winSize.height;
        _vertices[2] = 0;
        _vertices[3] = 0;
        _vertices[4] = winSize.width;
        _vertices[5] = winSize.height;
        _vertices[6] = winSize.width;
        _vertices[7] = 0;

        gl.bufferData(gl.ARRAY_BUFFER, _vertices, gl.DYNAMIC_DRAW);

        var squareVertexColorBuffer = this.squareVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
        colors = [
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        var squareVertexTexBuffer = this.squareVertexTexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexTexBuffer);
        textures = [
            0, 0,
            0, 1,
            1, 0,
            1, 1
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
});

var HelloWorldScene = cc.Scene.extend({
    helloWorldLayerNode: null,
    offset: 0,
    _tapDown: false,
    ctor: function () {
        this._super();
        //this.setScale(0.6);
        this.scheduleUpdate();
    },
    update: function (dt) {
        if (this._tapDown)
        {
            if (!this.helloWorldLayerNode._hero.getAwake())
            {
                this.helloWorldLayerNode._hero.wake();
                this._tapDown = false;
            }
            else
            {
                this.helloWorldLayerNode._hero.dive();
            }
        }
        else
        {
            // this.helloWorldLayerNode._hero.nodive();
        }
        this.helloWorldLayerNode._hero.limitVelocity();

        //var PIXELS_PER_SECOND = 100;
        //this.offset += PIXELS_PER_SECOND * dt;

        this.helloWorldLayerNode._space.step(dt);
        this.helloWorldLayerNode._hero.update(dt);

        //var winSize = cc.director.getWinSize();
        //var scale = (winSize.height * 3 / 4) / this.helloWorldLayerNode._hero.getPosition().y;
        //if (scale > 1)
        //{
        //    scale = 1;
        //}
        //this.helloWorldLayerNode.setScale(scale);

        var offset = this.helloWorldLayerNode._hero.getPosition().x;
        this.helloWorldLayerNode.setOffsetX(offset)
    },
    onEnter: function () {
        this._super();
        this.helloWorldLayerNode = new HelloWorldLayer();
        this.addChild(this.helloWorldLayerNode);

        var helloWorld = this;

        if( 'touches' in cc.sys.capabilities )
        {
            cc.eventManager.addListener({
                event: cc.EventListener.TOUCH_ALL_AT_ONCE,
                onTouchesEnded: function(touches, event)
                {
                    console.log("点了一下。")
                }}, this);
        }
        else if( 'mouse' in cc.sys.capabilities )
        {
            cc.eventManager.addListener({
                event: cc.EventListener.MOUSE,
                onMouseDown: function (event)
                {
                    helloWorld._tapDown = true;
                },
                onMouseUp: function (event)
                {
                    helloWorld._tapDown = false;
                }
            }, this);
        }
    }
});

Hero = cc.Sprite.extend({
        _body: null,
        _awake: false,
        //_space: null,

        ctor: function (spaceObj) {
            this._super("#seal1.png");
            this.init(spaceObj);
        },

        init: function (spaceObj) {
            var winSize = cc.director.getWinSize();
            var radius = 40;
            mass = 3;
            this._body = spaceObj.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0, 0))));
            this._body.setPos(cp.v(0, winSize.height / 2 + radius));
            var circle = spaceObj.addShape(new cp.CircleShape(this._body, radius, cp.v(0, 0)));
            //弹性
            circle.setElasticity(0);
            //摩擦
            circle.setFriction(0);
        },

        update: function (dt) {
            this.setPosition(this._body.getPos());
            if (this._awake) {
                var vel = this._body.getVel();
                var angle = cc.pToAngle(vel);
                this.setRotation(-1 * cc.radiansToDegress(angle));
            }
        },

        wake: function() {
            this._awake = true;
            this._body.applyImpulse(cc.p(1, 2), this.getPosition())
        }
})

Hero.createWithSpace = function (spaceObj) {
    cc.spriteFrameCache.addSpriteFrames("res/TinySeal.plist");

    return new Hero(spaceObj);
};

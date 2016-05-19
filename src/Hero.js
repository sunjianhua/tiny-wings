Hero = cc.Sprite.extend({
        _body: null,
        //_space: null,

        ctor: function (spaceObj) {
            this._super("#seal1.png");
            this.init(spaceObj);
        },

        init: function (spaceObj) {
            var radius = 40;
            mass = 3;
            this._body = spaceObj.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0, 0))));
            this._body.setPos(cp.v(200 + 5, (2 * radius + 5) * 5));
            var circle = spaceObj.addShape(new cp.CircleShape(this._body, radius, cp.v(0, 0)));
            circle.setElasticity(0.8);
            circle.setFriction(1);
        },

        update: function (dt) {
            this.setPosition(this._body.getPos())
            console.log("Hero 输出测试");
        }
})

Hero.createWithSpace = function (spaceObj) {
    cc.spriteFrameCache.addSpriteFrames("res/TinySeal.plist");

    return new Hero(spaceObj);
};

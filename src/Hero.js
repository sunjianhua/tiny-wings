Hero = cc.Sprite.extend({
        ctor: function () {
            this._super("#seal1.png");
            this.init();
        },

        init: function () {
            console.log("Hero 输出测试");
        },
})

Hero.createWithWorld = function () {
    cc.spriteFrameCache.addSpriteFrames("res/TinySeal.plist");
    return new Hero();
};

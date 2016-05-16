Hero = cc.Sprite.extend({
        ctor: function (fileName, rect, rotated) {
            cc.Sprite.prototype.ctor.call(this, fileName, rect, rotated);
            this.init();
        },

        init: function () {
            console.log("Hero 输出测试");
        },
})

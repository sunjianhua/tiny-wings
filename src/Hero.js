Hero = Hero || cc.Sprite.extend({
        ctor: function () {
            this._super();
            this.init();
        },

        init: function () {
            console.log("Hero 输出测试");
        },
})

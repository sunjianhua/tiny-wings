# 2016/4/23 开始更新到github

这个文章，主要是根据[How To Create A Game Like Tiny Wings with Cocos2D 2.X](https://www.raywenderlich.com/32958/how-to-create-a-game-like-tiny-wings-with-cocos2d-2-x-part-2)，用cocos2d-x js 3.9实现了一遍，原教程用的是box2d 物理引擎，因为想在浏览器和手机上运行，而cocos2d-x jsb的物理引擎接口只有Chipmunk？就把物理引擎换为了Chipmunk，代码完成了80%？剩下的是细化和完善，没兴趣继续下去，放弃，但是基本都有实现，还是值得一看。

[How To Create A Game Like Tiny Wings with Cocos2D 2.X](https://www.raywenderlich.com/32958/how-to-create-a-game-like-tiny-wings-with-cocos2d-2-x-part-2)是个人接触到比较好的教程之一，把设计思路和技术点有条不紊的细细道来，让看的人仿佛在看一个人作画，先是整体线稿，然后是逐渐细化，然后是细节描绘，最后再加一两处亮点，让人看的舒服，按这套路写代码，也是写的舒服，比如教程里地形的处理，先是用线段描绘出地形的大体，然后再调节地形各起伏点的范围，再把用作地形的线段修的圆润，再加上动态纹理，最后增加当鸟飞的高，地形动态缩放的亮点，一气看下来，真是行云流水，一气呵成。

[How To Create A Game Like Tiny Wings with Cocos2D 2.X](https://www.raywenderlich.com/32958/how-to-create-a-game-like-tiny-wings-with-cocos2d-2-x-part-2)的翻译文章 ：[（译）如何制作一个类似tiny wings的游戏](http://www.cnblogs.com/zilongshanren/archive/2011/07/01/2095489.html)

一篇转为Cocos2d-x 2.1.4的文章，个人参考比较多的是这个
[如何制作一个类似Tiny Wings的游戏(2) Cocos2d-x 2.1.4](http://blog.csdn.net/akof1314/article/details/9293797)

一篇扩展文章
[cocos2dx实现自定义2D地形](http://blog.csdn.net/z104207/article/details/44591865)



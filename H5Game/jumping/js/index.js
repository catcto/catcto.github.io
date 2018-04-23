'use strict';

// 定制一个 setInterval 方法
createjs.setInterval = function(cb, delay) {
    var interval = new createjs.Container(); 
    var tween = createjs.Tween.get(interval)
        .wait(delay) 
        .call(function() {
            cb && cb(); 
        }); 
    tween.loop = 1; 
    return tween; 
}
// 定制一个 clearInterval 方法
createjs.clearInterval = function(interval) { 
    // 删除动画
    createjs.Tween.removeTweens(interval.target); 
    // 删除实例
    interval = undefined; 
}

// 工具辅助类函数
var Utils = {
    // 函数节流
    throttle: function(fn, wait, scope) {
        wait || (wait = 200);
        var last = null,
            deferTimer = null;
        return function () {
            var context = scope || this;
            var remaining; // 剩余时间
    
            var now = +new Date(), // 获取现在时间
                args = arguments;
    
            if (last && now < last + wait) {
                // 距离上一次触发执行函数的时间，没有达到下一次触发的限制时间
                // 不执行传入函数，重置一个定时器
                remaining = wait - (now - last);
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, remaining);
            } else {
                // 距离上一次执行函数调用时间已超过限制时间，直接执行，并记录执行时间
                last = now;
                fn.apply(context, args);
            }
        };
    },
    // 区间随机数: min <= val < max
    getRandom: function (min, max) {
        return Math.random() * (max - min) + min;
    },
    // 区间随机整数
    getRandomInt: function (min, max) {
        return Math.floor(Utils.getRandom(min, max)); // 等效 Utils.getRandom(min,max) >> 0;
    },
    // 指定长度的01随机数组，用以生成 正确操作数组
    createRandomOneZero: function(len){
        if(len === 1) {
            return Utils.getRandomInt(0,2);
        }

        var arr = [];
        for (var i = 0; i < len; i++) {
            arr.push(Utils.getRandomInt(0,2));
        }
        return arr;
    },
    // 洗牌算法
    shuffle: function(arr) {
        for(var i = arr.length ; i > 0 ; i--) {
            var j = Utils.getRandomInt(0, i);
            [arr[i - 1], arr[j]] = [arr[j], arr[i - 1]];
        }
        return arr;
    },
    // 最大公约数
    getGCD: function(x, y){ 
        var max,min,temp;  
        max = x > y ? x : y ;  
        min = x < y ? x : y ;  
        while( max % min ){  
  
            temp = max % min;  
            max = min;  
            min = temp;  
        }  
        return min;  
    },
    // 最小公倍数
    getLCM: function(array){
        // 取数组的第一和第二个数，计算它们的公倍数，然后再取第三个数，  
        // 和之前的公倍数计算它们的公倍数，直到只有一个数。  
        for(var i = 1 ; i < array.length ; i++ ){
            var a = array[0],
                b = array[i];
            //计算公约数
            var gcd = Utils.getGCD(a, b);        
            //计算公倍数  
            array[0] =  a * b / gcd;
        }
        return array[0];
    },
    // 获取小数形式的分母
    getFracDeno: function(value, threshold) {
        var i=1, j=1; 
        while(Math.abs(i/j - value) > threshold) {
            if (i/j > value) {
                j++;
            } else if(i/j < value) {
                i++;
            }
        }
        return j;
    },
    // 按设定概率生成随机数组，用以生成 障碍距离数组
    // 实现办法二: 使用random() 
    // pr的形式示例:[0.5, 0.2, 0.2, 0.1],// 0占50%，1占20%，2占20%，3占10%
    createRandomInt_1: function(pr,len) {
        // 取概率分母
        var Prob = [];
        for(var q = 0; q < pr.length; q++) {
            Prob[q] = Utils.getFracDeno(pr[q], 0.001);
        }

        // 构建均等概率数组A
        var A = [];
        var L = Utils.getLCM(Prob);
        var l = 0;
        for(var i = 0; i < Prob.length ; i++) {
            var k = L * Prob[i] + l;
            while (l < k) {
                A[l] = i;
                l++;
            }
        }

        // 返回随机数
        if(len === 1) {
            var s = Utils.getRandomInt(0, A.length);
            return A[s];
        }else {
            var arr = [];
            for(var j = 0; j < len; j++) {
                var r = Utils.getRandomInt(0, A.length);
                arr.push(A[r]);
            }
            return arr;
        }
    },
    // 按设定概率生成随机数组，用以生成 障碍距离数组
    // 实现办法一: 利用洗牌算法替代random() && 直接传入等概率数组A
    // pr的形式示例:[0,0,0,0,0,1,1,2,2,3],// 0占50%，1占20%，2占20%，3占10%
    createRandomInt_2: function(pr, len) {
        if(len === 1) {
            Utils.shuffle(pr);
            return pr[0];
        }
        
        var arr = [];
        for(var i = 0; i < len ; i++) {
            Utils.shuffle(pr);
            arr.push(pr[0]);
        }
        return arr;     
    },
    // 反方向定位
    getOppoPos: function(objHeight, objBtmPos, stageHeight) {
        return - (objHeight - stageHeight + objBtmPos);
    }
}

/**
 * 游戏主函数
 * @constructor
 */
var Game = {
    // 暴露方法： init 、start 、restart 、 destory、pause、 resume
    init: function(opts){
        var self = this;
        // 默认配置
        this.config = {
            canvas: "J_game", // 游戏容器
            initStairs: 8, // 初始阶砖数
            distProb : [0.5, 0.2, 0.2, 0.1],// 0占50%，1占20%，2占20%，3占10%
            onGameEnd: function(score) {} // 游戏结束回调方法
        }
        for(var i in opts) {
            this.config[i] = opts[i];
        }

        // 初始化舞台
        this.canvas = document.getElementById(this.config.canvas);
        this.stage = new createjs.Stage(this.canvas);
        
        // 适配页面
        var w = document.documentElement.clientWidth,
            h = document.documentElement.clientHeight;
        this.stageWidth = w * 2;
        this.stageHeight = h * 2;
        this.canvas.setAttribute("width", this.stageWidth);
        this.canvas.setAttribute("height", this.stageHeight);

        // ticker
        createjs.Ticker.setFPS(60);
        createjs.Ticker.setPaused(true);
        createjs.Ticker.addEventListener("tick",function(e){
            if(!e.paused) {
                self.stage.update();                
            }
        });
        // 除了android 4.3以下的，其他都要raf
        var ua = navigator.userAgent,
            version = parseFloat(ua.substr(ua.indexOf('Android') + 8, 3));
        if((/Android/.test(ua) && (version > 4.3)) || !(/Android/.test(ua))) { 
            createjs.Ticker.timingMode = createjs.Ticker.RAF;
        }

        // 游戏静态参数
        this.areaThreshold = this.stageWidth / 2; // 点击区域划分阈值
        this.isAndroid = ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1;
        this.isStart = false;
    },
    run: function() {
        // 游戏运行所需参数
        this.stairSerial = Utils.createRandomOneZero(this.config.initStairs); // 无障碍阶梯初始化数组
        this.barrSerial = Utils.createRandomInt_1(this.config.distProb, this.config.initStairs); // 障碍阶梯初始化数组
        this.clickTimes = 0; // 用户点击次数
        this.dropInterval = null; // 定时器
        this.gameScore = 0; // 记录分数

        // 初始化场景
        createjs.Ticker.setPaused(false);
        this._createScene();

        // 绑定事件
        this._bindEvents();
    },
    start: function() {
        // 允许监听响应
        this.isStart = true;
    },
    restart: function() {
        // 清理舞台
        this.stage.clear();

        // 重新开始
        this.run();
        this.start();
    },
    loader: function(onLoad, onComplete) {
        var manifest = [
            { id: 'spriterobot', src: '/H5Game/jumping/images/spriterobot@2x_62f169c2.png' },
            { id: 'spritestairs', src: '/H5Game/jumping/images/spritestairs@2x_93b62155.png' },
            { id: 'leaf_left', src: '/H5Game/jumping/images/leaf_left@2x_98e55a9f.png' },
            { id: 'leaf_right', src: '/H5Game/jumping/images/leaf_right@2x_1ddeb6b9.png' },
        ];

        var loader = new createjs.LoadQueue(true);
        loader.loadManifest(manifest);

        loader.on('complete', function () { onComplete && onComplete();});
        loader.on('fileload', function (e) {
            var progress = parseInt(e.target.progress * 100) + '%';
            onLoad && onLoad(progress);
        });

        this.loader = loader;
    },
    _createScene: function() {
        var self = this;
        // 背景层
        this.sceneBackground = new createjs.Shape();
        this.sceneBackground.graphics.beginFill("#001605").drawRect(0, 0, this.stageWidth, this.stageHeight);
        
        // 树叶层
        this.Leaves = new Leaves({
            transThreshold: this.stageHeight
        });

        // 阶梯
        this.Floor = new Floor({
            stairSerial: this.stairSerial,
            barrSerial: this.barrSerial
        });

        // 机器人
        this.Robot = new Robot({
            initDirect: this.stairSerial[0]
        });

        // 阶梯层：由机器人和阶梯组成，方便整体移动
        this.Stairs = new createjs.Container();
        this.Stairs.addChild(this.Floor.sprite, this.Robot.sprite);
        this.Stairs.lastX = this.Stairs.x;
        this.Stairs.lastY = this.Stairs.y;

        // 加入场景
        this.stage.addChild(this.sceneBackground, this.Stairs, this.Leaves.sprite);
    },
    _bindEvents: function(){
        var self = this;

        // 移动端Touch
        createjs.Touch.enable(this.stage);

        // 响应用户点击
        var _click = Utils.throttle(this._handleUserClick, 70, self);
        this.sceneBackground.addEventListener("mousedown", _click.bind(self));
    },
    _handleUserClick: function(e) {
        var self = this;
        if(!this.isStart) return;

        // 第一次点击开始启动自动掉落阶梯
        this._autoDropStair();

        // 捕获用户点击指令，左点击为0，右边点击为1
        var stageX = e.stageX,
            direct = stageX >= this.areaThreshold ? 1 : 0; 
        
        var transX = direct ? 75 : -75;
        var transY = 100;

        // 场景响应：机器人前进、树叶层滞后移动、阶梯&机器人整体滞后回移
        direct ? this.Robot.right() : this.Robot.left();
        this.Robot.move(transX, transY);
        this.Leaves.move(transY);
        this._centerStairs(transX, transY);

        // 每跳一步，加入一块阶砖
        this._addStair();

        // 检验指令，匹配场景结果
        var res = this._checkUserAction(direct);
        switch(res) {
            case "barr": 
                this._shakeStairs();
                this.Robot.hitAndDisappear();
                this._gameOver();
                break;
            case "drop":
                this.Robot.dropAndDisappear(direct);
                this._gameOver();
                break;
            case "pass":
                this.gameScore++;
                break;
        }

    },
    _gameOver: function() {
        var self = this;
        // 去掉定时器
        this._clearAutoDropStair();

        // 暂停监听
        this.isStart = false;

        // 游戏结束回调
        this.config.onGameEnd(this.gameScore);

    },
    _centerStairs: function(transX ,transY){
        this.Stairs.lastX -= transX;
        this.Stairs.lastY += transY;
        createjs.Tween.removeTweens(this.Stairs);
        createjs.Tween.get(this.Stairs, {override:true}).to({ x: this.Stairs.lastX , y: this.Stairs.lastY },500);
    },
    _shakeStairs: function() {
        // 碰撞抖动
        createjs.Tween.removeTweens(this.Stairs);
        createjs.Tween.get(this.Stairs, {override: true})
        .to({x: this.Stairs.x + 5, y: this.Stairs.y - 5}, 50, createjs.Ease.getBackInOut(2.5))
        .to({x: this.Stairs.x, y: this.Stairs.y}, 50, createjs.Ease.getBackInOut(2.5))
        .to({x: this.Stairs.x + 5, y: this.Stairs.y - 5}, 50, createjs.Ease.getBackInOut(2.5))
        .to({x: this.Stairs.x, y: this.Stairs.y },50,createjs.Ease.getBackInOut(2.5))
        .pause();

        // 安卓震动API
        if (this.isAndroid) {
            window.navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;
            window.navigator.vibrate([100, 30, 100, 30, 100, 200, 200, 30, 200, 30, 200, 200, 100, 30, 100, 30, 100]);
            window.navigator.vibrate(0); // 停止抖动
        }
    },
    _addStair: function() {
        var stairSerialNum = Utils.createRandomOneZero(1);
        var barrSerialNum = Utils.createRandomInt_1(this.config.distProb, 1);
        var needAnimation = true;
        this.stairSerial.push(stairSerialNum);
        this.barrSerial.push(barrSerialNum);
        this.Floor.add(stairSerialNum, barrSerialNum, needAnimation);
    },
    _autoDropStair: function() {
        if(this.dropInterval) { return; }
        var self = this;
        this.dropInterval = createjs.setInterval(function(){
            self.Floor.drop();
            if(self.Floor.dropIndex == self.clickTimes) { // 机器人脚下的阶砖掉落
                createjs.clearInterval(self.dropInterval);
                console.log("游戏失败", "阶砖掉落");
                self.Robot.dropAndDisappear();
                self._gameOver();
            }
        }, 500);
    },
    _clearAutoDropStair: function() {
        createjs.clearInterval(this.dropInterval);
    },
    _checkUserAction: function(code) {
        var result = "";
        if(this.stairSerial[this.clickTimes] !== code) {
            if(this.barrSerial[this.clickTimes] === 1) {
                result = "barr"; // 遇到障碍物且障碍物近在眼前
            }else {
                result =  "drop"; // 踩空
            }
            this._clearAutoDropStair();
        }else {
            result =  "pass"; // 通过
        }
        console.log(result);
        this.clickTimes++;
        return result;
    }
}

/**
 * 机器人
 * @constructor
 */
var Robot = function(config) {
    this.config = {
        initDirect: [] // 机器人初始方向
    }
    for(var i in config) {
        this.config[i] = config[i];
    }

    // 记录
    this.lastDirect = -1;
    this.lastPosX = 0;
    this.lastPosY = 0;

    this.init();
}

Robot.prototype.init = function(){
    var spriteSheet = new createjs.SpriteSheet({
        "images": [Game.loader.getResult('spriterobot')],
        "frames": {width: 150, height: 294, count: 21},
        "animations": {
            walk: [0, 9, "walk", 0.2],
            jump: [10, 16, 0 , 0.5]
        }
    });

    // 设置初始位置
    this.sprite = new createjs.Sprite(spriteSheet);
    this.lastPosX = this.sprite.x = (Game.stageWidth - this.sprite.getBounds().width) / 2 + 40;
    this.lastPosY = this.sprite.y = Utils.getOppoPos(this.sprite.getBounds().height, 350, Game.stageHeight);
    
    // 默认是左向，如果下一阶砖在右边则右向
    this.config.initDirect && this.right(false);
    
};

Robot.prototype.move = function(transX, transY){
    this.lastPosX += transX;
    this.lastPosY -= transY;
    this.sprite.gotoAndPlay('jump');
    createjs.Tween.get(this.sprite, {override: true}).to({x: this.lastPosX, y: this.lastPosY }, 200);
};

Robot.prototype.right = function(){
    if(this.lastDirect === 1) return;
    this.sprite.regX = 145;
    this.sprite.scaleX = -1;
    this.lastDirect = 1;
};

Robot.prototype.left = function(){
    if(this.lastDirect === 0) return;
    this.sprite.regX = 0;
    this.sprite.scaleX = 1;
    this.lastDirect = 0;
};

Robot.prototype.hitAndDisappear = function(){
    createjs.Tween.removeTweens(this.sprite);
    createjs.Tween.get(this.sprite, {override: true})
    .wait(500)
    .set({visible:false})
};

Robot.prototype.dropAndDisappear = function(direction){
    // 没有方向值时为直线掉落，否则为跳跃掉落
    var x = (typeof direction === "undefined") ? 0 : ( direction ?  75 : -75 );
    this.sprite.stop();
    createjs.Tween.removeTweens(this.sprite);
    createjs.Tween.get(this.sprite, {override: true})
    .to({x: this.sprite.x + 2*x, y: this.sprite.y - 240}, 250)
    .to({y: this.sprite.y + Game.stageHeight}, 800)
    .set({visible: false});
}

/**
 * 景物层（树叶层）
 * @constructor
 */
var Leaves = function(config) {
    this.config = {
        transThreshold: 0 // 背景循环节点
    }
    for(var i in config) {
        this.config[i] = config[i];
    }

    // 记录
    this.moving = false;
    this.lastPosY1 = 0; // 树叶1的最终y位置
    this.lastPosY2 = 0; // 树叶2的最终y位置
    this.init();
}

Leaves.prototype.init = function() {
    // 创建左右侧树叶
    var leafLeft = new createjs.Bitmap(Game.loader.getResult("leaf_left")),
        leafRight = new createjs.Bitmap(Game.loader.getResult("leaf_right"));

    leafLeft.x = 0;
    leafRight.x = Game.stageWidth - leafRight.getBounds().width;
    
    // 创建两张树叶背景
    this.leafCon1 = new createjs.Container();
    this.leafCon1.addChild(leafLeft, leafRight);
    this.leafHeight = this.leafCon1.getBounds().height;
    this.lastPosY1 = this.leafCon1.y = Utils.getOppoPos(this.leafHeight, 0, Game.stageHeight);
    
    this.leafCon2 = this.leafCon1.clone(true);
    this.lastPosY2 = this.leafCon2.y = this.leafCon1.y - this.leafHeight;

    // 整体
    this.sprite = new createjs.Container();
    this.sprite.addChild(this.leafCon1, this.leafCon2);

};

Leaves.prototype.move = function(transY) {
    if(this.moving) return;
    this.moving = true;
    
    // 树叶是往下走的（正方向所以+)
    var posY1 = this.leafCon1.y; // 此时位置
    this.lastPosY1 = posY1 + transY; // 最终位置

    // leafCon2
    var posY2 = this.leafCon2.y;
    this.lastPosY2 = posY2 + transY;
    
    // 滑动
    createjs.Tween.removeTweens(this.leafCon1);
    if(posY1 >= this.config.transThreshold) { // 到循环节点，重置位置
        this.leafCon1.y = this.lastPosY2 - this.leafHeight;
    }else {
        createjs.Tween.get(this.leafCon1, {override:true})
        .to({ y: this.lastPosY1 },500)
    }
    
    createjs.Tween.removeTweens(this.leafCon2);
    if(posY2 >= this.config.transThreshold) {
        this.leafCon2.y = this.lastPosY1 - this.leafHeight;
    }else {
        createjs.Tween.get(this.leafCon2, {override:true})
        .to({ y: this.lastPosY2 },500)
    }

    this.moving = false;
};

/**
 * 阶梯层
 * @constructor
 */

var Floor = function(config) {
    this.config = {
        stairSerial: [], // 无障碍阶砖的随机01数组，左零，右1
        barrSerial: [] // 障碍阶砖的随机距离数组，0～3范围
    }
    for(var i in config) {
        this.config[i] = config[i];
    }

    // 最后一块阶砖的位置，方便下次生成位置作为标准
    this.lastPosX = 0;
    this.lastPosY = 0;

    // 记录编号
    this.stairSerial = [];
    this.barrSerial = [];

    // 记录对应的数组
    this.dropIndex = -1;
    this.stairArr = []; // 存储掉落，因为stairCon.chidlren次序会受到调整影响
    
    this.init();
}

Floor.prototype.init = function() {
    var spriteSheet = new createjs.SpriteSheet({
        "images": [Game.loader.getResult("spritestairs")],
        "frames": [
            [0, 0, 150, 126],
            [0, 126, 170, 180],
            [170, 126, 170, 180],
            [340, 126, 170, 180],
            [510, 126, 170, 180],
            [680, 126, 170, 180]
        ],
        "animations": {
            stair: [0],
            wood: [1],
            landmine: [2],
            ice: [3],
            mushroom: [4],
            stone: [5]
        }
    });

    var stone = new createjs.Container(),
        ice = new createjs.Container(),
        wood = new createjs.Container(),
        mushroom = new createjs.Container(),
        landmine = new createjs.Container(),
        makeups = ["stone", "ice", "wood", "mushroom", "landmine"];
    
    this.stair = new createjs.Sprite(spriteSheet, "stair")
    this.stair.width = this.stair.getBounds().width;
    this.stair.height = this.stair.getBounds().height;

    // 组装阶砖与装饰变成障碍阶砖
    this.barriers = [stone, ice, wood, mushroom, landmine];
    for(var i = 0; i < this.barriers.length; i++) {
        var makeup = new createjs.Sprite(spriteSheet, makeups[i]);
        var barrStair = this.stair.clone(true);
        makeup.y = barrStair.y - 60;
        this.barriers[i].addChild(barrStair, makeup);
    }

    // 游戏主体容器，方便装载后整体加载
    this.barrCon = new createjs.Container();
    this.stairCon = new createjs.Container();

    // 创建初始阶梯－第一个阶转
    var firstStair = this.stair.clone();
    firstStair.x = (Game.stageWidth - this.stair.width / 2) / 2;
    firstStair.y = Utils.getOppoPos(this.stair.height, 300, Game.stageHeight);
    this.lastPosX = firstStair.x;
    this.lastPosY = firstStair.y;
    this.stairCon.addChild(firstStair);
    this.stairArr.push(firstStair);

    // 创建初始阶梯－以第一个阶转位置为依据，继续生成剩余阶转
    var stairSerial = this.config.stairSerial,
        barrSerial = this.config.barrSerial;
    this.add(stairSerial, barrSerial, false);

    this.sprite = new createjs.Container();
    this.sprite.addChild(this.stairCon, this.barrCon);
};

Floor.prototype.adjustZIndex = function(container) { // 阶砖显示层次按y轴位置进行调整，低位覆盖高位
    function sortFunction(obj1, obj2, options) {
        if (obj1.y > obj2.y) { return 1; }
        if (obj1.y < obj2.y) { return -1; }
        return 0;
    }
    container.sortChildren(sortFunction);
}

Floor.prototype._add = function(stairSerialNum, barrSerialNum, needAnimation) {
    // 记录
    this.stairSerial.push(stairSerialNum);
    this.barrSerial.push(barrSerialNum);

    // 无障碍阶砖
    var tmpStair = this.stair.clone(),
        tmpStairX = this.lastPosX + (stairSerialNum ? 1 : -1) * (this.stair.width / 2),
        tmpStairY = this.lastPosY - (this.stair.height - 26);
    
    tmpStair.x = tmpStairX;
    this.stairCon.addChild(tmpStair);
    this.stairArr.push(tmpStair);
    
    
    // 根据需要加入动画
    if(needAnimation) {
        tmpStair.y = tmpStairY - 200;
        createjs.Tween.get(tmpStair, {override: true})
        .to({ y: tmpStairY }, 200)
    }else {
        tmpStair.y = tmpStairY;
    }

    // 障碍阶砖
    if(barrSerialNum !== 0) { // 0 代表没有
        var tmpBarr = this.barriers[Utils.getRandomInt(0, this.barriers.length)].clone(true),
            tmpBarrX = this.lastPosX + (stairSerialNum ? -1 : 1) * (this.stair.width / 2) * barrSerialNum,
            tmpBarrY = this.lastPosY - (this.stair.height - 26) * barrSerialNum;
        
        tmpBarr.x = tmpBarrX;
        this.barrCon.addChild(tmpBarr);
    
        // 根据需要加入动画
        if(needAnimation) {
            tmpBarr.y = tmpBarrY - 200;
            createjs.Tween.get(tmpBarr, {override: true})
            .to({ y: tmpBarrY }, 200)
        }else {
            tmpBarr.y = tmpBarrY;
        }
    }

    // 更新最后位置
    this.lastPosX = tmpStairX;
    this.lastPosY = tmpStairY;

}

Floor.prototype.add = function(stairSerial, barrSerial, needAnimation) {
    if(typeof stairSerial === "object") { // 数组形式
        var len = stairSerial.length;
        for(var j = 0 ; j < len ; j++) {
            this._add(stairSerial[j], barrSerial[j]);
        }
    }else { // 单个形式
        this._add(stairSerial, barrSerial, needAnimation);
    }
    //调整显示层次
    this.adjustZIndex(this.stairCon);
    this.adjustZIndex(this.barrCon);

};

Floor.prototype._dropStair = function(stair) {
    var self = this;

    // 掉落无障碍阶砖
    var thisStairY = stair.y;

    // 如果已是准备掉落的，则不需要重新掉落
    if(createjs.Tween.hasActiveTweens(stair)) return;
    createjs.Tween.get(stair, {override: true})
    .to({y: thisStairY + 300}, 500)
    .call(function(){
        self.stairCon.removeChild(stair);
        createjs.Tween.removeTweens(stair); //动画线回收
    })

    // 掉落同一个y轴上或该位置以下的障碍物阶砖
    var barrArr = this.barrCon.children;
    for(var i in barrArr) { //不能用length 会动态变化
        var barr = barrArr[i],
            thisBarrY = barr.y;
        if(barr.y >= thisStairY) { // 位置等于或者低于
            createjs.Tween.get(barr, {override: true})
            .to({y: thisBarrY + 300}, 500)
            .call(function(){
                self.barrCon.removeChild(barr);
                createjs.Tween.removeTweens(barr); //动画线回收
            })
        }
    }

    this.dropIndex++;
}

Floor.prototype.drop = function() {
    var self = this;

    // 掉落无障碍阶砖
    var stair = this.stairArr.shift();
    stair && this._dropStair(stair);

    // 阶梯存在数量超过9个以上进行批量清除
    if(this.stairArr.length >= 9) {
        var num = this.stairArr.length - 9,
            arr = this.stairArr.splice(0, num);
        for(var i = 0; i < arr.length; i++) {
            this._dropStair(arr[i]);
        }
    }
};
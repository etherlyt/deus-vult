import vars from '../variables';
import * as utils from '../utils';
import { sendMessage, sendMessageTrusted, readMessages, cypherMessage } from '../communication';

var enemyCastles = [];
var symmetry = [false, false];
var deusVult = [null, null];
var deusVultFrom = null;

export default function prophetTurn() {
  // this.log("I am a Prophet at "+vars.xpos+" "+vars.ypos);
  if (vars.firstTurn) {
    var creator = this.getRobot(vars.visibleRobotMap[vars.creatorPos[1]][vars.creatorPos[0]]);
    var message = Math.floor(cypherMessage(creator.signal, this.me.team)/8);
    if (message%2==1) {
      symmetry[0] = true;
    }
    if (Math.floor(message/2)==1) {
      symmetry[1] = true;
    }
    if (symmetry[0]) {
      enemyCastles.push([vars.xmax-1-vars.creatorPos[0], vars.creatorPos[1]]);
    }
    if (symmetry[1]) {
      enemyCastles.push([vars.creatorPos[0], vars.ymax-1-vars.creatorPos[1]]);
    }
    vars.firstTurn = false;
  }

  // check for DEUS VULT signal
  if (deusVult[1]==null) {
    outer: for (var i = 0; i < vars.visibleRobots.length; i++) {
      if (!this.isRadioing(vars.visibleRobots[i])||this.me.team!=vars.visibleRobots[i].team) {
        continue;
      }
      var pos = [vars.visibleRobots.x, vars.visibleRobots.y];
      if (vars.visibleRobots[i].unit==0) {
        var message = cypherMessage(vars.visibleRobots[i].signal, this.me.team);
        if ((message & 2**15)>0 && (message & 2**14)==0 && deusVult[0]==null) {
          //this.log("DEUS VULT 0 RECEIVED");
          deusVultFrom = vars.visibleRobots[i].id;
          deusVult = [message-2**15, null];
          break outer;
        }
        if (message>=2**15+2**14 && deusVult[0]!=null && vars.visibleRobots[i].id==deusVultFrom) {
          //this.log("DEUS VULT 1 RECEIVED");
          deusVult = [deusVult[0], message-2**15-2**14];
        }
      }
    }
  }

  // attacking
  if (this.fuel >= vars.attackCost) {
    var bestDir = null;
    for (var i = 0; i < vars.visibleEnemyRobots.length; i++) {
      var x = vars.visibleEnemyRobots[i].x;
      var y = vars.visibleEnemyRobots[i].y;
      var dx = x-this.me.x;
      var dy = y-this.me.y;
      if (vars.attackRadius[0]<=dx**2+dy**2&&dx**2+dy**2<=vars.attackRadius[1]) {
        if (bestDir==null||dx**2+dy**2 < bestDir[0]**2+bestDir[1]**2) {
          bestDir = [dx, dy];
        }
      }
    }
    if (bestDir!=null) {
      //this.log("Attacking "+(this.me.x+bestDir[0])+" "+(this.me.y+bestDir[1]));
      return this.attack(bestDir[0], bestDir[1]);
    }
  }

  // moving
  if (this.fuel >= vars.moveCost*vars.moveRadius) {

    // DEUS VULT, attack deusVult
    if (deusVult[1]!=null) {
      var x = deusVult[0];
      var y = deusVult[1];
      var id = vars.visibleRobotMap[y][x];
      // check if already dead
      if (id==0||(id>0&&this.getRobot(id).unit!=vars.SPECS.CASTLE)) {
        deusVult = [null, null];
        deusVultFrom = null;
        this.castleTalk(64);
        return;
      }
      var move = utils.findMoveD.call(this, [this.me.x, this.me.y], deusVult);
      if (move != null) {
        //this.log("Moving towards "+x+" "+y);
        return this.move(move[0], move[1]);
      }
    }
    else {
      // archer lattice
      var betterPos = [];
      for (var i = 0; i < vars.visible.length; i++) {
        var x = this.me.x+vars.visible[i][0];
        var y = this.me.y+vars.visible[i][1];
        var curDist = (this.me.x-vars.creatorPos[0])**2+(this.me.y-vars.creatorPos[1])**2;
        var newDist = (x-vars.creatorPos[0])**2+(y-vars.creatorPos[1])**2;
        // robust addition
        var empty = utils.checkBounds(x, y)&&vars.passableMap[y][x]&&vars.visibleRobotMap[y][x]<=0;
        var lattice = (x+y)%2==0&&((this.me.x+this.me.y)%2==1||newDist<curDist);
        // lattice = curDist<=1 || lattice;
        // if (newDist <= 1) {
        //   continue;
        // }
        if(empty&&lattice) {
          betterPos.push([x, y]);
        }
      }
      betterPos.sort(function (v1, v2) {
        var d1 = (v1[0]-vars.creatorPos[0])**2+(v1[1]-vars.creatorPos[1])**2;
        var d2 = (v2[0]-vars.creatorPos[0])**2+(v2[1]-vars.creatorPos[1])**2;
        return d1-d2;
      });
      // this.log("betterPos");
      // this.log(betterPos);

      var paths = utils.astar.call(this, [this.me.x, this.me.y], betterPos, 5);
      // this.log("paths");
      // this.log(paths);
      for (var i = 0; i < betterPos.length; i++) {
        var path = paths[utils.hashCoordinates(betterPos[i])];
        if (path!=null&&path.length>0) {
          // this.log(this.me.x+" "+this.me.y+" to "+betterPos[i][0]+" "+betterPos[i][1]);
          // this.log(path);
          return this.move(path[0][0], path[0][1]);
        }
      }


      // goes to creatorPos if not deusVult
      // if ((this.me.x-vars.creatorPos[0])**2+(this.me.y-vars.creatorPos[1])**2 > vars.CAMPDIST) {
      //   var move = utils.findMoveD.call(this, [this.me.x, this.me.y], vars.creatorPos);
      //   if (move != null) {
      //     return this.move(move[0], move[1]);
      //   }
      // }

      // defend in direction of enemies
      // var x = enemyCastles[0][0];
      // var y = enemyCastles[0][1];
      // var id = vars.visibleRobotMap[y][x];
      // var curDist = (this.me.x-vars.creatorPos[0])**2+(this.me.y-vars.creatorPos[1])**2;
      // var newDist = (x-vars.creatorPos[0])**2+(y-vars.creatorPos[1])**2;
      // var move = utils.findMoveD.call(this, [this.me.x, this.me.y], enemyCastles[0]);
      // if (move != null&&curDist < newDist && newDist <= vars.CAMPDIST) {
      //   //this.log("Moving towards "+x+" "+y);
      //   return this.move(move[0], move[1]);
      // }

      // 1 move to better pos
      // for (var i = 0; i < vars.moveable.length; i++) {
      //   var x = this.me.x+vars.moveable[i][0];
      //   var y = this.me.y+vars.moveable[i][1];
      //   var newDist = (x-vars.creatorPos[0])**2+(y-vars.creatorPos[1])**2;
      //   var open = utils.checkBounds(x, y) && vars.visibleRobotMap[y][x]==0 && vars.passableMap[y][x];
      //   if (open && curDist < newDist && newDist <= vars.CAMPDIST) {
      //     return this.move(vars.moveable[i][0], vars.moveable[i][1]);
      //   }
      // }
    }
  }
}

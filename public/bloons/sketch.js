const cHeight = 800;
const cWidth = 800;

const laneCount = 5;

class Lane {
    constructor(count, total) {
        this.y = count * (cHeight / total);
    }
}

const lanes = [];

function setup() {
    createCanvas(cWidth, cHeight);
    for (let i = 0; i < laneCount; i++) {
        lanes.push(new Lane(i, laneCount));
    }
}

function draw() {
    background(240);
    for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        fill('red');
        line(0, lane.y, cWidth, lane.y);
    }
}

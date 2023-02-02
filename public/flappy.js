class Player {
    constructor(width, height, brain = undefined) {
        // default width and height
        this.width = width;
        this.height = height;

        if (brain) {
            this.brain = brain;
            this.brain.inputLabels = [
                'falling speed',
                'closest obstacle',
                'closest opening top',
                'closest opening bottom',
                'bias',
            ];
            this.brain.outputLabels = ['flap'];
        }
    }

    x = 20;
    y = cWidth / 2;
    isCrouching = false;
    isFloating = false;
    isDead = false;
    score = 0;
    dy = 0;

    reset() {
        this.y = cWidth / 2;
        this.dy = 0;
        this.isDead = false;
    }

    thinkAndAct(observations) {
        const decisions = this.brain.feedForward(observations);
        if (decisions[0] > 0.6) {
            this.flap();
        }
    }

    flap() {
        this.dy = -8;
    }

    update() {
        this.y += this.dy;
        this.dy += 30 / 60;

        if (isFlapping) {
            this.flap();
        }

        this.dy = constrain(this.dy, -8, 25);
    }

    draw() {
        fill('black');

        image(playerImg, this.x - 15, this.y - 11);
    }

    hitBy(projectiles) {
        for (let projectile of projectiles) {
            if (
                intersection(this, projectile.box1) ||
                intersection(this, projectile.box2)
            ) {
                return projectile;
            }
        }

        return false;
    }

    // gets information about closest projectile
    // there are two at a time only, WE CHEAT
    getObservations(projectiles) {
        let nearestProjectile = projectiles[0];

        if (nearestProjectile.box1.x + nearestProjectile.width < this.x) {
            nearestProjectile = projectiles[1];
        }

        return [
            map(this.dy, -8, 25, 0, 1), // our own falling speed
            map(nearestProjectile.box1.x - this.x, 0, cWidth - this.x, 0, 1), // distance to nearest projectile
            // otherProjectile ? map(otherProjectile.box1.x - this.x, 0, cWidth - this.x, 0, 1) : 1, // distance to other projectile
            // nearest projectile info
            map(
                max(0, this.y - nearestProjectile.box1.height),
                0,
                nearestProjectile.openingSize,
                0,
                1,
            ), // distance from top opening
            map(
                max(0, nearestProjectile.box2.y - this.y),
                0,
                nearestProjectile.openingSize,
                0,
                1,
            ), // distance from bottom opening
        ];
    }
}

const cHeight = 800;
const cWidth = 600;
// this is an obstacle
class Projectile {
    width = 70;
    constructor() {
        this.opening = (random(0.6) + 0.2) * cHeight;
        this.openingSize = 200;
        this.box1 = {
            x: cWidth,
            y: 0,

            width: this.width,
            height: cHeight - this.opening - this.openingSize / 2,
        };

        this.box2 = {
            x: cWidth,
            y: this.box1.height + this.openingSize,

            width: this.width,
            height: cHeight,
        };
    }

    x = cWidth;

    dx = -5;
    update() {
        this.box1.x += this.dx;
        this.box2.x += this.dx;
    }
    draw() {
        fill('red');
        image(pipeImg, this.box1.x, this.box1.height - cHeight);
        image(pipeImg, this.box2.x, this.box2.y);
        // rect(this.box1.x, this.box1.y, this.width, this.box1.height);
        // rect(this.box2.x, this.box2.y, this.width, this.box2.height);
    }
}

class ProjectileManager {
    projectiles = [];

    draw() {
        this.projectiles.forEach((p) => p.draw());
    }

    update() {
        if (
            this.projectiles.length === 0 ||
            this.projectiles[this.projectiles.length - 1].box1.x < cWidth / 2
        ) {
            this.projectiles.push(new Projectile());
        }
        this.projectiles.forEach((p) => p.update());
    }

    // delete off screen projectiles
    prune() {
        for (let i = 0; i < this.projectiles.length; i++) {
            if (this.projectiles[i].box1.x + this.projectiles[i].width < 0) {
                this.projectiles.splice(i, 1);
                i--;
            }
        }
    }
}

let player;
let isFlapping = false;

let pm;
let frames = 0;
let brain;
let population = [];
const popTarget = 6000;
let maxHunger = 600;

let playAsHuman = true;
let playerImg;
let backgroundImg;
let pipeImg;

let checkbox;
let flag = false;
function debugFlag() {
    flag = !!checkbox.checked();
}

function toggleFs() {
    let fs = fullscreen();
    fullscreen(!fs);
}

function setup() {
    createCanvas(cWidth, cHeight);
    backgroundImg = loadImage('assets/bg_sky.png');
    backgroundImg.resize(cWidth, cHeight);
    pipeImg = loadImage('assets/pipe.png');

    pipeImg.resize(70, cHeight);
    frameRate(60);
    const button = createButton('go fast');
    button.position(550, 30);
    button.mousePressed(toggleFps);

    const fsButton = createButton('fullscreen');
    fsButton.position(550, cHeight - 50);
    fsButton.mousePressed(toggleFs);

    button.position(550, 30);
    button.mousePressed(toggleFps);

    const toggleb = createButton('switch mode');
    toggleb.position(550, 50);
    toggleb.mousePressed(switchPlayers);
    pm = new ProjectileManager();

    playerImg = loadImage('assets/aibird.png', (img) => img.resize(60, 60));

    player = new Player(35, 35);
    for (let i = 0; i < popTarget; i++) {
        population.push(new Player(35, 35, new Brain(4, 1, [])));
    }
}

let brainExecutionTime = 0;
let isOneDrawn = false;
const matingPoolPercent = 0.08;
let generation = 0;
let highScore = 0;

let fast = false;

function matingRitual() {
    const newPopulation = [];
    const besttw = population
        .sort((a, b) => b.score - a.score)
        .slice(0, popTarget * matingPoolPercent);
    if (besttw[0].score > highScore) {
        console.log('new high score', besttw[0].score);
        highScore = besttw[0].score;
        try {
            localStorage.setItem(
                'highscorebrain',
                JSON.stringify(besttw[0].brain),
            );
            localStorage.setItem('highscore', highScore);
        } catch (e) {
            console.log('error saving', besttw[0].brain);
        }
    }
    let brains = [];
    for (let i = 0; i < besttw.length - 1; i += 2) {
        for (let j = 0; j < floor(1 / matingPoolPercent) * 2; j++) {
            let newBrain;
            // the better the brain, the more likely to just copy it
            if (random(1) * j < 0.25) {
                newBrain = besttw[i].brain;
            } else {
                newBrain = besttw[i].brain.merge(besttw[i + 1].brain);
            }

            newBrain = besttw[i].brain.merge(
                besttw[i + 1].brain,
                besttw[i + 1].score > besttw[i].score,
            );

            newBrain = _.cloneDeep(newBrain);
            newBrain.mutate();
            newPopulation.push(
                new Player(besttw[i].width, besttw[i].height, newBrain),
            );
            brains.push(newBrain);
        }
    }
    population = newPopulation;
}

function switchPlayers() {
    resetGame();
    playAsHuman = !playAsHuman;
    genSuccRatioMap = {};
}

let genSuccRatioMap = {};

function stats(playersAlive) {
    text('players alive: ' + playersAlive, 15, 12);
    text(
        'brain execution time: ' +
            (brainExecutionTime / frames).toFixed(4) +
            'ms',
        15,
        24,
    );
    text('generation ' + generation, 15, 36);
    text('high score ' + highScore, 15, 48);
    text('fps ' + frameRate().toFixed(2), 15, 60);
    text('current score ' + frames, 15, 72);
    // text('brains w more neurons ' + population.reduce(
    //     (acc, curr) => acc + (
    //         curr.brain.layers.length && !curr.isDead ? 1 : 0), 0), 15, 60)

    // const tempScoreHist = {};
    // for (let i = 0; i < 3; i++) {
    //   tempScoreHist[generation - i - 1] = genSuccRatioMap[generation - i - 1];
    // }
    // text(JSON.stringify(tempScoreHist, null, 2), 350, 10);
}

function nnUi() {
    const playersAlive = population.reduce(
        (acc, curr) => acc + (curr.isDead ? 0 : 1),
        0,
    );
    noStroke();
    fill('white');
    strokeWeight(3);
    stroke('black');
    stats(playersAlive);

    if (playersAlive === 0) {
        console.log('ALL DEAD.');
        const avgScore =
            population.reduce((acc, curr) => acc + curr.score, 0) /
            population.length;
        const sorted = population.sort((a, b) => b.score - a.score);
        const medianScore = sorted[floor(population.length / 2)].score;
        const inputWeightStats = {};
        const inputSums = [];
        population.forEach((p, i) => {
            for (let i = 0; i < 5; i++) {
                if (!inputSums[i]) inputSums[i] = 0;
                inputSums[i] += p.brain.neurons[i].outputWeights[0];
            }
        });
        inputSums.forEach((s, i) => {
            inputWeightStats[population[0].brain.inputLabels[i]] =
                s / population.length;
        });
        genSuccRatioMap[generation] = {
            avgScore,
            medianScore,
            highScore: sorted[0].score,
            // bestBrainRundown: {
            //     layers: sorted[0].brain.layers,
            //     connectionCount: sorted[0].brain.neurons.reduce((acc, curr) => acc + curr.outputWeights.length, 0)
            // },
            inputWeightStats,
        };
        matingRitual();
        resetGame();
        generation++;
        frames = 0;
        brainExecutionTime = 0;
        return;
    }

    isOneDrawn = false;
    const t1 = performance.now();
    population.forEach((player, i) => {
        // noLoop();
        if (player.isDead) {
            return;
        }
        const observations = player.getObservations(pm.projectiles);

        player.thinkAndAct(observations);

        player.update();

        let proj;
        if (
            (proj =
                player.hitBy(pm.projectiles) ||
                player.y <= 0 ||
                player.y + player.height >= cHeight)
        ) {
            player.score += frames;
            player.isDead = true;
            return;
            // color('red');
            // text("YOU LOSE", 400, 300);
            // noLoop();
        }

        if (isOneDrawn) {
            // tint(0, 150, 204, 60)
            // player.draw();
            noStroke();
            fill(0, 140, 240, 32);
            circle(
                player.x + player.width / 2,
                player.y + player.height / 2,
                10,
            );
        } else if (!isOneDrawn && !player.isDead) {
            tint(255, 256);
            text('viewing player ' + i, 20, 600 - 250);
            player.draw();
            player.brain.draw();
            // console.log(player.brain.neurons)
            if (flag) {
                debugger;
            }
            if (frames % 300 === 0) {
                console.log('viewing brain', player.brain);
            }
            isOneDrawn = true;
        }
    });
    const t2 = performance.now();
    brainExecutionTime += t2 - t1;
}

let run = false;
function humanUi() {
    fill('white');
    stroke('black');
    strokeWeight(2);
    if (!run) {
        textAlign(CENTER);
        text('PRESS UP ARROW TO CONTINUE', cWidth / 2, cHeight / 2 + 20);
        textAlign(LEFT);
        noLoop();
    }
    text(frames, 10, 10);
    if (isFlapping) {
        rect(10, 40, 20, 20);
    }
    if (player.hitBy(pm.projectiles) || player.y >= cHeight || player.y < 0) {
        player.isDead = true;
        textAlign(CENTER);
        text('UR DEAD', cWidth / 2, cHeight / 2);
        text(
            'PRESS ENTER (or tap or click) TO CONTINUE',
            cWidth / 2,
            cHeight / 2 + 20,
        );
        textAlign(LEFT);
        noLoop();
        return;
    }

    player.update();
    player.draw();
}

function draw() {
    // background(220);
    background(backgroundImg);
    pm.update();
    pm.prune();
    pm.draw();

    if (!playAsHuman) {
        nnUi();
    } else {
        humanUi();
    }

    frames++;
}

function resetGame() {
    pm.projectiles = [];
    if (player) player.reset();
    population.forEach((p) => p.reset());
    frames = 0;
}

function touchStarted() {
    if (!playAsHuman) return;

    isFlapping = true;
    if (!player.isDead) {
        run = true;
    } else {
        resetGame();
    }
    loop();
}

function touchEnded() {
    isFlapping = false;
}

function keyPressed() {
    if (keyCode === UP_ARROW && playAsHuman) {
        isFlapping = true;
        if (!player.isDead) {
            run = true;
            loop();
        }
        // player.flap();
    } else if (keyCode === ENTER) {
        resetGame();
        loop();
    }
}

function keyReleased() {
    if (keyCode === UP_ARROW) {
        isFlapping = false;
    }
}

function toggleFps() {
    if (fast) {
        frameRate(60);
        fast = false;
    } else {
        frameRate(1000);
        fast = true;
    }
}

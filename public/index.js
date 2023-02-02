class Player {
    constructor(width, height, brain = undefined) {
        // default width and height
        this._width = width;
        this._height = height;
        this.width = width;
        this.height = height;

        this._y = 600 - height;
        if (brain) this.brain = brain;
        else this.brain = new Brain(3, 2, [2]);
    }

    x = 20;
    y = 0;
    isCrouching = false;
    isFloating = false;
    isDead = false;
    score = 0;
    framesSinceEaten = 0;

    thinkAndAct(observations) {
        const decisions = this.brain.feedForward(observations);
        if (decisions[0] > 0.6 && decisions[1] < decisions[0]) {
            this.isCrouching = true;
            this.isFloating = false;
        } else if (decisions[1] > 0.6 && decisions[1] > decisions[0]) {
            this.isFloating = true;
            this.isCrouching = false;
        } else {
            this.isCrouching = false;
            this.isFloating = false;
        }
    }

    update() {
        if (this.isCrouching) {
            this.y = this._y + this._height / 2;
            this.height = this._height / 2;
        } else if (this.isFloating) {
            this.y = this._y;
            this.height = this._height / 2;
        } else {
            this.height = this._height;
            this.y = this._y;
        }
        this.framesSinceEaten++;
    }

    draw() {
        fill('black');

        rect(this.x, this.y, this.width, this.height);
    }

    hitBy(projectiles) {
        for (let projectile of projectiles) {
            if (intersection(this, projectile)) {
                return projectile;
            }
        }

        return false;
    }

    // gets information about closest projectile
    getObservations(projectiles) {
        // only one projectile at a time rn, lets cheat
        const p = projectiles.projectiles[0];
        if (!p) {
            return undefined;
        }

        const distanceFromProj = Math.abs(p.x - this.x);
        const projDistanceFromGround = 600 - p.y;

        // distance, height, color
        return [
            map(distanceFromProj, 0, 800 - this.x - this.width, 0, 1),
            p.y === 600 - 150 ? 1 : 0,
            p.color === 'red' ? 1 : 0,
            map(this.framesSinceEaten, 0, maxHunger, 0, 1),
        ];
    }
}

class Projectile {
    constructor() {
        this.y = 600 - (random([true, false]) ? 150 : 50);
    }

    x = 800;
    y = 600;

    color = random(1) > 0.5 ? 'red' : 'blue';

    dx = -15;
    width = 30;
    height = 20;
    update() {
        this.x += this.dx;
    }
    draw() {
        fill(this.color);
        rect(this.x, this.y, this.width, this.height);
    }
}

class ProjectileManager {
    projectiles = [];

    draw() {
        this.projectiles.forEach((p) => p.draw());
    }

    update() {
        if (this.projectiles.length === 0) {
            this.projectiles.push(new Projectile());
        }
        this.projectiles.forEach((p) => p.update());
    }

    // delete off screen projectiles
    prune() {
        for (let i = 0; i < this.projectiles.length; i++) {
            if (this.projectiles[i].x < 0) {
                this.projectiles.splice(i, 1);
                i--;
            }
        }
    }
}

let player;
let pm;
let frames = 0;
let brain;
let population = [];
const popTarget = 5000;
let maxHunger = 600;
function setup() {
    createCanvas(800, 600);
    frameRate(120);
    const button = createButton('fps');
    button.position(750, 30);
    button.mousePressed(toggleFps);
    pm = new ProjectileManager();

    for (let i = 0; i < popTarget; i++) {
        population.push(new Player(100, 200, new Brain(4, 2, [])));
    }
}

let brainExecutionTime = 0;
let isOneDrawn = false;
const matingPoolPercent = 0.08;
let generation = 0;
let highScore = 0;

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
            newPopulation.push(new Player(100, 200, newBrain));
            brains.push(newBrain);
        }
    }
    population = newPopulation;
}

const genSuccRatioMap = {};

function draw() {
    frames++;
    background(240);

    const playersAlive = population.reduce(
        (acc, curr) => acc + (curr.isDead ? 0 : 1),
        0,
    );
    stroke('none');
    fill('black');
    text('players alive: ' + playersAlive, 5, 10);
    text(
        'brain execution time: ' +
            (brainExecutionTime / frames).toFixed(4) +
            'ms',
        5,
        20,
    );
    text('generation ' + generation, 5, 30);
    text('high score ' + highScore, 5, 40);
    text('fps ' + frameRate().toFixed(2), 5, 50);
    text(
        'brains w more neurons ' +
            population.reduce(
                (acc, curr) =>
                    acc + (curr.brain.layers.length && !curr.isDead ? 1 : 0),
                0,
            ),
        5,
        60,
    );

    const tempScoreHist = {};
    for (let i = 0; i < 3; i++) {
        tempScoreHist[generation - i - 1] = genSuccRatioMap[generation - i - 1];
    }
    text(JSON.stringify(tempScoreHist, null, 2), 300, 10);

    if (playersAlive === 0 || frames > 3000) {
        console.log('ALL DEAD.');
        const avgScore =
            population.reduce((acc, curr) => acc + curr.score, 0) /
            population.length;
        const sorted = population.sort((a, b) => b.score - a.score);
        const medianScore = sorted[population.length / 2].score;
        genSuccRatioMap[generation] = {
            avgScore,
            medianScore,
            highScore: sorted[0].score,
            bestBrainRundown: {
                layers: sorted[0].brain.layers,
                connectionCount: sorted[0].brain.neurons.reduce(
                    (acc, curr) => acc + curr.outputWeights.length,
                    0,
                ),
            },
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
        const observations = player.getObservations(pm);
        if (!observations) {
        } else {
            player.thinkAndAct(observations);
        }

        player.update();

        let proj;
        if ((proj = player.hitBy(pm.projectiles))) {
            if (proj.color === 'red' || player.framesSinceEaten >= maxHunger) {
                player.score += frames;
                player.isDead = true;
            } else {
                player.framesSinceEaten = 0;
                player.score += 400;
            }
            // color('red');
            // text("YOU LOSE", 400, 300);
            // noLoop();
        } else if (player.framesSinceEaten >= maxHunger) {
            player.score += frames;
            player.isDead = true;
        }

        if (!isOneDrawn) {
            text('viewing player ' + i, 20, 600 - 250);
            player.draw();
            player.brain.draw();
            if (frames % 300 === 0) {
                console.log('viewing brain', player.brain);
            }
            isOneDrawn = true;
        }
    });
    const t2 = performance.now();
    brainExecutionTime += t2 - t1;

    pm.update();
    pm.prune();

    pm.draw();
}

function resetGame() {
    pm.projectiles = [];
    frames = 0;
}

function keyPressed() {
    if (keyCode === DOWN_ARROW) {
        player.isCrouching = true;
    } else if (keyCode === UP_ARROW) {
        player.isFloating = true;
    } else if (keyCode === ENTER) {
        resetGame();
        loop();
    }
}

function keyReleased() {
    if (keyCode === DOWN_ARROW) {
        player.isCrouching = false;
    } else if (keyCode === UP_ARROW) {
        player.isFloating = false;
    }
}

function toggleFps() {
    if (frameRate() > 60) {
        frameRate(20);
    } else {
        frameRate(150);
    }
}

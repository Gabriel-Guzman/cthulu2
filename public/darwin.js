function sigmoid(x) {
    return 1.0 / (1.0 + pow(Math.E, -4.9 * x)); //todo check pow
}

class Neuron {
    outputValue = 0;
    inputValue = 0;
    outputNeurons = [];
    outputWeights = [];
    isNew = false;

    id() {
        return `${this.outputNeurons.length}_${this.outputWeights.reduce(
            (acc, curr) => acc + `${curr}`,
            '',
        )}`;
    }

    constructor(outputWeights = undefined) {
        if (outputWeights !== undefined) {
            this.outputWeights = outputWeights;
        }
    }
}

function randomMerge(arr1, arr2, length) {
    const output = [];
    let tempArray = [];
    for (let i = 0; i < length; i++) {
        tempArray.push(i);
    }

    tempArray = shuffle(tempArray);

    for (let i = 0; i < length; i++) {
        if (i < tempArray.length / 2) {
            if (!arr1[i]) {
                output[i] = random(-1, 1);
            } else {
                output[i] = arr1[i];
            }
        } else {
            if (!arr2[i]) {
                output[i] = random(-1, 1);
            } else {
                output[i] = arr2[i];
            }
        }
    }

    return output;
}

class Brain {
    constructor(inputs, outputs, layers = []) {
        this.neurons = [];
        this.biasNode = inputs;
        this.layers = layers;

        this.inputs = inputs;
        this.outputs = outputs;

        this.newNeurons = 0;

        for (let i = 0; i < this.inputs + 1; i++) {
            this.neurons[i] = new Neuron();
        }

        let lastLayer = this.neurons.slice(0, this.inputs + 1);

        const layersWithOutput = layers.concat([this.outputs]);
        layersWithOutput.forEach((nodeCount) => {
            let currentLayer = [];
            for (let i = 0; i < nodeCount; i++) {
                const newNeuron = new Neuron();

                currentLayer.push(newNeuron);

                lastLayer.forEach((neuron) => {
                    neuron.outputNeurons.push(newNeuron);
                    neuron.outputWeights.push(random(-1, 1));
                });
                this.neurons.push(newNeuron);
            }

            lastLayer = currentLayer;
        });
    }

    feedForward(inputValues) {
        // reset the network
        for (let i = 0; i < this.neurons.length; i++) {
            this.neurons[i].inputValue = 0;
        }
        // update weights one by one
        for (let i = 0; i < this.inputs; i++) {
            this.neurons[i].inputValue = inputValues[i];
        }
        for (let i = 0; i < this.neurons.length; i++) {
            let currentValue = this.neurons[i].inputValue;
            if (i >= this.inputs) {
                currentValue = sigmoid(currentValue);
            }

            if (i === this.biasNode) {
                currentValue = 1;
            }

            this.neurons[i].outputValue = currentValue;
            const self = this;
            this.neurons[i].outputNeurons.forEach((neuron, index) => {
                try {
                    neuron.inputValue +=
                        self.neurons[i].outputWeights[index] * currentValue;
                } catch (e) {
                    debugger;
                }
            });
        }

        return this.neurons.slice(-this.outputs).map((n) => n.outputValue);
    }

    isNewNode(index) {
        console.log(
            this.inputs,
            this.totalLayerNodes(),
            this.neurons.length,
            this.outputs,
        );
        return (
            (index >= this.inputs + 1 + this.totalLayerNodes()) &
            (index < this.neurons.length - this.outputs)
        );
    }

    newNodeIndex(index) {
        if (!this.isNewNode(index)) {
            throw new Error('index ' + index + 'is not a new node');
        }

        return this.inputs + 1 + this.totalLayerNodes() + index;
    }

    getRealIndexFromNewNode(newNodeIndex) {
        const i =
            this.neurons.length - this.outputs - this.newNeurons + newNodeIndex;
        if (!this.isNewNode(i)) {
            console.log(this);
            throw new Error(
                'index ' +
                    i +
                    ', fake index: ' +
                    newNodeIndex +
                    'is not a new node',
            );
        }
        return i;
    }

    getOriginalNeurons() {
        return this.neurons
            .slice(0, this.inputs + 1 + this.totalLayerNodes())
            .concat(this.neurons.slice(-this.outputs));
    }

    getNewNeurons() {
        return this.neurons.slice(
            this.inputs + 1 + this.totalLayerNodes(),
            this.neurons.length - this.outputs,
        );
    }

    draw() {
        const top = 120;
        const left = 150;
        const newNsTop = 80;

        const newNeurons = {};
        const self = this;

        let lastOutputs = [];
        let currentNode = 0;

        // acounts for bias node with + 1
        const layersWithOutput = [this.inputs + 1]
            .concat(this.layers)
            .concat(this.outputs);
        let currentX = 0;

        const inputLabelMap = this.inputLabels || [
            'proj distance',
            'proj height',
            'proj color',
            'hunger',
            'bias',
        ];

        const outputLabelMap = this.outputLabels || ['crouch', 'jump'];

        let neuronCount = 0;
        const posMap = new Map();
        layersWithOutput.forEach((nodeCount) => {
            let currentY = 0;

            for (let i = 0; i < nodeCount; i++) {
                fill('white');
                stroke('black');
                strokeWeight(2);
                const x = left + currentX;
                const y = top + currentY + ((this.inputs - nodeCount) * 40) / 2;
                if (neuronCount < this.inputs + 1) {
                    textAlign(RIGHT);
                    text(inputLabelMap[neuronCount], x - 10, y);
                } else if (neuronCount >= this.neurons.length - this.outputs) {
                    textAlign(LEFT);
                    text(
                        outputLabelMap[
                            this.outputs - (this.neurons.length - neuronCount)
                        ],
                        x + 10,
                        y,
                    );
                }
                fill('black');
                noStroke();
                circle(x, y, 10);

                posMap.set(self.neurons[neuronCount], [x, y]);

                currentY += 40;
                neuronCount++;
            }

            currentX += 80;
            currentY = 0;
        });
        textAlign(LEFT);

        this.neurons.forEach((n) => {
            n.outputWeights.forEach((ow, i) => {
                const destination = posMap.get(n.outputNeurons[i]);
                if (!destination) {
                    return;
                }
                const source = posMap.get(n);

                if (ow < 0) {
                    stroke(n.outputValue * 255, 0, 0);
                    // stroke(`rgb(${(-ow) * n.outputValue * 255}, 0, 0, 1)`);
                    // stroke('rgba(255, 0, 0, ' + (-ow) * n.outputValue + ')');
                    strokeWeight(-ow * 3.7 + 0.3);
                } else {
                    // stroke(`rgba(0, ${(ow) * n.outputValue * 255}, 0, 1)`);

                    stroke(0, n.outputValue * 255, 0);
                    // stroke('rgba(0, 255, 0, ' + (ow) * n.outputValue + ')');
                    strokeWeight(ow * 3.7 + 0.3);
                }
                line(...source, ...destination);
            });
        });
        strokeWeight(1);
    }

    merge(otherBrain, preferOtherBrain = false) {
        if (
            otherBrain.layers.length !== this.layers.length ||
            !_.isEqual(otherBrain.layers, this.layers)
        ) {
            // grab the layers we can

            const layers = [];
            for (
                let i = 0;
                i < max(this.layers.length, otherBrain.layers.length);
                i++
            ) {
                if (otherBrain.layers[i] === this.layers[i]) {
                    layers.push(i);
                } else {
                    break;
                }
            }

            const untilNeuron =
                this.inputs + 1 + layers.reduce((acc, curr) => acc + curr, 0);

            let newBrain;
            if (preferOtherBrain) {
                newBrain = _.cloneDeep(otherBrain);
            } else {
                newBrain = _.cloneDeep(this);
            }

            for (let i = 0; i < untilNeuron; i++) {
                newBrain.neurons[i].outputWeights = randomMerge(
                    this.neurons[i].outputWeights,
                    otherBrain.neurons[i].outputWeights,
                    newBrain.neurons[i].outputWeights.length,
                );
            }

            return newBrain;
        }
        // const newBrain = new Brain(this.inputs, this.outputs, this.layers);
        let newBrain;
        if (preferOtherBrain) {
            newBrain = _.cloneDeep(otherBrain);
        } else {
            newBrain = _.cloneDeep(this);
        }
        newBrain.neurons.forEach((neuron, i) => {
            neuron.outputWeights = randomMerge(
                this.neurons[i].outputWeights,
                otherBrain.neurons[i].outputWeights,
                neuron.outputWeights.length,
            );
        });

        let debug = true;
        for (let i = 0; i < newBrain.neurons.length; i++) {
            const n = newBrain.neurons[i];
            if (!n.outputNeurons) debugger;
            if (n.outputNeurons.length > 1) {
                debug = false;
            }
        }
        if (debug && newBrain.neurons.length > 7) debugger;
        return newBrain;
    }

    totalLayerNodes() {
        return this.layers.reduce((acc, curr) => acc + curr, 0);
    }

    getOutputs() {
        return this.neurons.slice(-this.outputs);
    }

    nonOutPuts() {
        return this.neurons.slice(0, this.neurons.length - this.outputs);
    }

    addNodeMutation() {
        if (this.layers.length > 0) {
            const rand3 = random(1);

            // add new layer
            if (rand3 > 0.95) {
                const startOfLastLayer =
                    this.inputs.length -
                    this.outputs -
                    this.layers[this.inputs.length - 1];
                const availableNs = this.neurons.slice(
                    startOfLastLayer,
                    this.outputs,
                );

                const newNeuron = new Neuron();
                const input = random(availableNs);
                const output = random(this.getOutputs());

                newNeuron.outputNeurons = [output];
                newNeuron.outputWeights.push(random(-1, 1));
                input.outputNeurons.push(newNeuron);
                input.outputWeights.push(random(-1, 1));

                this.neurons = this.nonOutPuts()
                    .concat([newNeuron])
                    .concat(this.getOutputs());

                this.layers.push(1);
            } else {
                // add to a layer

                const rLayer = floor(random(this.layers.length));

                const endOfAvailableNodesIndex =
                    this.inputs +
                    1 +
                    this.layers
                        .slice(0, rLayer)
                        .reduce((acc, curr) => acc + curr, 0);
                const availableInputs = this.neurons.slice(
                    0,
                    endOfAvailableNodesIndex,
                );

                const startOfAvailableOutPuts =
                    endOfAvailableNodesIndex + this.layers[rLayer];
                const availableOutputs = this.neurons.slice(
                    startOfAvailableOutPuts,
                );

                const input = random(availableInputs);
                const output = random(availableOutputs);

                const newNeuron = new Neuron();
                newNeuron.outputNeurons.push(output);
                newNeuron.outputWeights.push(random(-1, 1));

                input.outputNeurons.push(newNeuron);
                input.outputWeights.push(random(-1, 1));

                this.neurons = this.neurons
                    .slice(0, this.inputs + 1 + this.totalLayerNodes())
                    .concat([newNeuron])
                    .concat(this.neurons.slice(-this.outputs));
                this.layers[rLayer]++;
                if (newNeuron.outputNeurons.length === 0) {
                    debugger;
                }
            }
        } else {
            this.layers = [1];
            const input = random(this.neurons.slice(0, this.inputs));
            const newNeuron = new Neuron();
            newNeuron.outputNeurons.push(random(this.getOutputs()));

            newNeuron.outputWeights.push(random(-1, 1));

            input.outputNeurons.push(newNeuron);
            input.outputWeights.push(random(-1, 1));
            this.neurons = this.neurons
                .slice(0, this.inputs + 1)
                .concat([newNeuron])
                .concat(this.neurons.slice(-this.outputs));
        }
    }

    addConnectionMutation() {
        if (this.layers.length === 0) {
            // this brain is already fully connected
            return;
        }
        // find a neuron that isn't already connected to every node in front of it
        let neuron;
        for (let i = 0; i < this.neurons.length; i++) {
            neuron = this.neurons[i];
            // this is an input of bias node
            if (i < this.inputs + 1) {
                for (
                    let j = this.inputs + 1 + 1;
                    j < this.neurons.length;
                    j++
                ) {
                    if (_.find(neuron.outputNeurons, this.neurons[j])) {
                        // we are already connected
                    } else {
                        // new connection
                        neuron.outputNeurons.push(this.neurons[j]);
                        neuron.outputWeights.push(random(-1, 1));
                        return;
                    }
                }
            } else if (i < this.neurons.length - this.outputs) {
                // check neurons in the next layers
                let currentNeuron = this.inputs + 1;
                for (let layer in this.layers) {
                    currentNeuron += layer;
                    if (currentNeuron > i) {
                        break;
                    }
                }
                // we are at the index of the layer after this neurons
                // check for compatibility

                if (
                    !_.find(
                        this.neurons[i].outputNeurons,
                        this.neurons[currentNeuron],
                    )
                ) {
                    // add connection
                    console.log(
                        'considering',
                        this.neurons[i],
                        this.neurons[currentNeuron],
                    );
                    this.neurons[i].outputNeurons.push(
                        this.neurons[currentNeuron],
                    );
                    this.neurons[i].outputWeights.push(random(-1, 1));
                    return;
                }
            }
        }
    }

    changeWeightsMutation() {
        for (let i = 0; i < this.neurons.length; i++) {
            for (let j = 0; j < this.neurons[i].outputWeights.length; j++) {
                const rand = random(1);
                if (rand < 0.1) {
                    //10% of the time completely change the this.weight
                    this.neurons[i].outputWeights[j] = random(-1, 1);
                } else {
                    //otherwise slightly change it
                    this.neurons[i].outputWeights[j] += randomGaussian() / 50;
                    //keep this.weight between bounds
                    if (this.neurons[i].outputWeights[j] > 1) {
                        this.neurons[i].outputWeights[j] = 1;
                    }
                    if (this.neurons[i].outputWeights[j] < -1) {
                        this.neurons[i].outputWeights[j] = -1;
                    }
                }
            }
        }
    }

    mutate() {
        const rand = random(1);
        if (rand > 0.8) {
            this.changeWeightsMutation();
        }

        // add a node with just one connection
        // to solidify the neuron array:
        // [inputs][biasNode][layers][mutatedInputs][outPuts]
        const rand2 = random(1);
        if (rand2 < 0.01) {
            this.addNodeMutation();
        }

        const rand3 = random(1);
        if (rand3 < 0.06) {
            this.addConnectionMutation();
        }
    }
}

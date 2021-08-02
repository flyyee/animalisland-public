function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

let bad = 0
for (let x = 0; x < 500; x++) {
    if (getRandomInt(2) == 1) {
        bad += 1
    }
    
}
console.log(bad)
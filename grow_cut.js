let RGB,class_mask,weight_mask;
let next_class_mask,next_weight_mask;
let max_height,max_width;
let background_changes = 0;
let object_changes = 0;
let iteration = 0;
function loadImageToTensor(img_can,mask_can) {
    var img = nj.images.read(img_can);
    var mask = nj.images.read(mask_can);
    RGB = img.slice(null,null,[0,3]);
    let object_mask = mask.slice(null,null,[0,1]).divide(255).reshape(mask.shape[0],mask.shape[1]);
    let background_mask = nj.zeros([mask.shape[0],mask.shape[1]]).subtract(mask.slice(null,null,[2,3]).divide(255).reshape(mask.shape[0],mask.shape[1]));
    class_mask = background_mask.add(object_mask);
    weight_mask = nj.abs(class_mask);

    max_height = RGB.shape[0];
    max_width = RGB.shape[1];

}
function makeIteration(mask_can){
    growIteration();
    let R = class_mask.multiply(128).add(128).reshape(class_mask.shape[0],class_mask.shape[1],1);
    let G = class_mask.multiply(128).add(128).reshape(class_mask.shape[0],class_mask.shape[1],1);
    let B = class_mask.multiply(128).add(128).reshape(class_mask.shape[0],class_mask.shape[1],1);
    let res = nj.concatenate(nj.concatenate(R,G),B);
    nj.images.save(res,mask_can);
    iteration +=1;
    console.log("Iteration", iteration,"done!");
}
function growIteration() {
    next_class_mask = class_mask.clone();
    next_weight_mask = weight_mask.clone();
    background_changes = 0;
    object_changes = 0;
    for(let i = 1; i<RGB.shape[0]-1; ++i){
        for(let j = 1; j<RGB.shape[1]-1; ++j){
            neighboursAllOutAttack(i,j);
        }
    }
    //console.log("Main part done!");
    //Walls Paddings processing
    for(let i = 1; i<RGB.shape[0]-1; ++i) {
        neighboursWallsAttack(i,0,1);
        neighboursWallsAttack(i,RGB.shape[1]-1,-1);
    }
    //console.log("Walls done!");
    //Floors Paddings Processing
    for(let j = 1; j<RGB.shape[1]-1; ++j) {
        neighboursFloorsAttack(0,j,1);
        neighboursFloorsAttack(RGB.shape[0]-1,j,-1);
    }
    //console.log("Floors done!");
    console.log("Background Changes:", background_changes);
    console.log("Object Changes:", object_changes);
    class_mask = next_class_mask;
    weight_mask = next_weight_mask;
}
function neighboursAllOutAttack(i,j) {
    if(class_mask.get(i,j) < 1){
        cellProcess(i, j, i + 1, j + 1);
        cellProcess(i, j, i + 1, j);
        cellProcess(i, j, i + 1, j - 1);
        cellProcess(i, j, i, j + 1);
        cellProcess(i, j, i, j - 1);
        cellProcess(i, j, i - 1, j + 1);
        cellProcess(i, j, i - 1, j);
        cellProcess(i, j, i - 1, j - 1);
    }
}
function neighboursWallsAttack(i,j,mode) {
    if(class_mask.get(i,j) < 1) {
        cellProcess(i, j, i - 1, j);
        cellProcess(i, j, i + 1, j);
        cellProcess(i, j, i - 1, j + mode);
        cellProcess(i, j, i, j + mode);
        cellProcess(i, j, i + 1, j + mode);
    }
}
function neighboursFloorsAttack(i,j,mode) {
    if(class_mask.get(i,j) < 1) {
        cellProcess(i, j, i, j - 1);
        cellProcess(i, j, i, j + 1);
        cellProcess(i, j, i + mode, j - 1);
        cellProcess(i, j, i + mode, j);
        cellProcess(i, j, i + mode, j + 1);
    }
}
function cellProcess(x1,y1,x2,y2){
    let cell_2_class = class_mask.get(x2,y2);
    if(cell_2_class != 0 && class_mask.get(x1,y1) != class_mask.get(x2,y2)) {
        let cell_1 = RGB.slice([x1, x1 + 1], [y1, y1 + 1],null);
        let cell_2 = RGB.slice([x2, x2 + 1], [y2, y2 + 1],null);
        let cell_1_weight = weight_mask.get(x1, y1);
        let cell_2_weight = weight_mask.get(x2, y2);
        let distance = Math.sqrt(((cell_1.subtract(cell_2)).pow(2)).sum());
        let g = 1 - (distance / 441.67);
        let enemy_val = g  * cell_2_weight;
        if(enemy_val > cell_1_weight && enemy_val > next_weight_mask.get(x1,y1)) {
            if(class_mask.get(x2, y2) == -1){
                background_changes +=1;
            }
            if(class_mask.get(x2, y2) == 1){
                object_changes +=1
            }
            next_weight_mask.set(x1, y1, enemy_val);
            next_class_mask.set(x1, y1, cell_2_class);
        }
    }
}
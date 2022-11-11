let face_classifier;
let eyes_classifier;
const FPS = 24;
let prev_com = null;
let begin = Date.now();
var playPromise = null;
var stream = null;
var timerId = null;
var start = true;


function openCvReady() {
    document.getElementById("startAndStop").disabled = false;
}
function HaarFaceLoad(){
    face_classifier = new cv.CascadeClassifier();
    let utils = new Utils('errorMessage');
    let faceCascadeFile = 'haarcascade_frontalface_default.xml'; // path to xml
    utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
        face_classifier.load(faceCascadeFile); // in the callback, load the cascade from file
    });
}
function HaarEyesLoad(){
    eyes_classifier = new cv.CascadeClassifier();
    let utils = new Utils('errorMessage');
    let faceCascadeFile = 'haarcascade_eye.xml'; // path to xml
    utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
        eyes_classifier.load(faceCascadeFile); // in the callback, load the cascade from file
    });
}
function HaarDetection(classifier){
    let video = document.getElementById("cameraInput");
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
    let gray = new cv.Mat();
    let cap = new cv.VideoCapture(cameraInput);
    let frames = new cv.RectVector();
    function processVideo() {
        cap.read(src);
        src.copyTo(dst);
        cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0);
        try {
            classifier.detectMultiScale(gray, frames, 1.1, 3, 0);
        } catch (err) {
        }
        for (let i = 0; i < frames.size(); ++i) {
            let frame = frames.get(i);
            let point1 = new cv.Point(frame.x, frame.y);
            let point2 = new cv.Point(frame.x + frame.width, frame.y + frame.height);
            cv.rectangle(dst, point1, point2, [255, 0, 0, 255]);
        }
        cv.imshow("canvasOutput", dst);
        // schedule next one.
    }
    let delay = 1000/FPS - (Date.now() - begin);
    timerId = setInterval(processVideo, delay);
}
function HaarMultipleDetection(outer_classifier,inner_classifier){
    let video = document.getElementById("cameraInput");
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
    let gray = new cv.Mat();
    let cap = new cv.VideoCapture(cameraInput);
    let frames = new cv.RectVector();
    let inner_frames = new cv.RectVector();
    function processVideo() {
        cap.read(src);
        src.copyTo(dst);
        cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0);
        try {
            outer_classifier.detectMultiScale(gray, frames, 1.1, 3, 0);
        } catch (err) {
        }
        for (let i = 0; i < frames.size(); ++i) {
            let frame = frames.get(i);
            let point1 = new cv.Point(frame.x, frame.y);
            let point2 = new cv.Point(frame.x + frame.width, frame.y + frame.height);
            cv.rectangle(dst, point1, point2, [255, 0, 0, 255]);
            let rect = new cv.Rect(frame.x, frame.y, frame.width, frame.height);
            let innerROI = src.roi(rect);
            inner_classifier.detectMultiScale(innerROI, inner_frames, 1.1, 3, 0);
            for (let i = 0; i < inner_frames.size(); ++i) {
                let inner_frame = inner_frames.get(i);
                let point1 = new cv.Point(frame.x + inner_frame.x, frame.y + inner_frame.y);
                let point2 = new cv.Point(frame.x + inner_frame.x + inner_frame.width, frame.y + inner_frame.y + inner_frame.height);
                cv.rectangle(dst, point1, point2, [255, 0, 0, 255]);
            }

        }
        cv.imshow("canvasOutput", dst);
        // schedule next one.
    }
    let delay = 1000/FPS - (Date.now() - begin);
    timerId = setInterval(processVideo, delay);
}
function EmptyWork(){
    let video = document.getElementById("cameraInput");
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let cap = new cv.VideoCapture(cameraInput);
    function processVideo() {
        cap.read(src);
        cv.imshow("canvasOutput", src);
        // schedule next one.
    }
    let delay = 1000/FPS - (Date.now() - begin);
    timerId = setInterval(processVideo, delay);
}
async function cameraStart(){
    const constraints = window.constraints = {
        audio: false,
        video: true
    };
    if(stream == null)
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    let video = document.querySelector('video');
    console.log(stream);
    video.srcObject = stream;
    playPromise = video.play();
    console.log(playPromise);
    document.getElementById('startAndStop').textContent = "Stop";
    start = false;
}
async function cameraStop(){
    if (playPromise !== undefined) {
        console.log(playPromise);
        playPromise.then(_ => {
            console.log(video.pause());
        }).catch(error => {
        });
    }
    document.getElementById('startAndStop').textContent = "Start";
    start = true;
    clearInterval(timerId)
}
function restartCameraWith(command){
    if (!start) {
        console.log('Interapting ' + prev_com + "by " + command + "");
        cameraStop();
    }
    cameraChange(command);
}
function cameraChange(command) {
    if(command == '') {
        if(prev_com == null)
        {
            console.log("Lets start");
            command = "Empty";
        }else{
            console.log("Run previous command: " + prev_com);
            command = prev_com;
        }
    }
    console.log("Current Command " + command);
    document.getElementById("option_menu").textContent = command;
    prev_com = command
    console.log(start);
    if (start) {
        cameraStart();
        start = false;
        switch (command) {
            case "Face Detection": {
                if (face_classifier == null) {
                    console.log('Load HaarFaceLoad');
                    HaarFaceLoad();
                }
                console.log('Start HaarFaceDetection');
                HaarDetection(face_classifier);
                break;
            }
            case "Eyes Detection": {
                if (eyes_classifier == null) {
                    console.log('Load HaarEyesLoad');
                    HaarEyesLoad();
                }
                console.log('Start HaarEyesDetection');
                HaarDetection(eyes_classifier);
                break;
            }
            case "Face + Eyes": {
                if (eyes_classifier == null) {
                    console.log('Load HaarEyesLoad');
                    HaarEyesLoad();
                }
                if (face_classifier == null) {
                    console.log('Load HaarFaceLoad');
                    HaarFaceLoad();
                }
                console.log('Start Face + Eyes');
                HaarMultipleDetection(face_classifier,eyes_classifier);
                break;
            }
            case "Empty": {
                console.log('Start Empty');
                EmptyWork();
                break;
            }
        }
    } else{
        console.log('Stop' + command);
        cameraStop();
    }
}



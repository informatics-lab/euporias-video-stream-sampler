const NUM_BELLS = 26;
//const STRIKE_URL = "http://xxxxx.ngrok.io/strike/";
const BELL_SERVER = "http://0.0.0.0:5000";	//Testing
//const CONTAINER = $('#keyboard');
bells = [];

function strike(letter) {
	var JSONArr=[];
	bell = bells[letter];
    if (bell) {
        console.log(bell);
		JSONArr.push(bell.i);
        //jQuery.get(STRIKE_URL + bell.i);
		console.log(JSONArr);
//		request.post(BELL_SERVER + '/strike').json(JSONArray);
        bell.element.fadeOut(100).fadeIn(100);
    }
};


for (var i = 0; i < NUM_BELLS; i++) {
//	key = String.fromCharCode(97 + i)
//	color = Math.floor(0xFFFFFF * Math.random()).toString(16);
//	element = $(`<section class="key" style='background-color:#${color};'>${key}</section>`);
//    bells[key] = {
//        i: i,
//        letter: key,
//        element: element
//    };
//    element.click(() => { strike(key) });
//    CONTAINER.append(element);
}



Rx.Observable.fromEvent(document, "keypress").subscribe((e) => {
    strike(e.key);
});

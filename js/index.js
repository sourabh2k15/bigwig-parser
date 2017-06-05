$(document).ready(function(){
	console.log("app ready");
	$('#f').change(function(){
		file= this.files[0];
		if(!file) return;

		makeBigWig(file,function(d,e){
			if(d==null) console.log(e);
			else{
				// d is our object of bigwig class
				console.log(d);
				d.getValues("chr21",25357722, 25403865,draw);
			}
		},"mytrack");
	});
});

function draw(values){
	console.log(values);
	var c = document.getElementById('browser');
	var w = c.width;
	var h = c.height;
	var ctx = c.getContext('2d');
	ctx.fillStyle = 'black';
	ctx.fillRect(0,0,w,h);

	ctx.fillStyle = 'white';
	var start = values[0][0];
	for(var i=0;i<values.length;i++){
		var offset = values[i][0]-start;
		var wi = values[i][1] - values[i][0];
		var hi = values[i][2];
		ctx.fillRect(offset,h,wi,-hi);
		offset+=wi;
	}
}

function textdraw(values){
	var t = "";
	console.log("values read: "+values.length);
	for(var i=0;i<values.length;i++){
		t+="[ "+values[i][0]+","+values[i][1]+","+values[i][2]+"]";
	}
	$("#result").html(t);
}
//utilities
function log(m){
	console.log(m);
}

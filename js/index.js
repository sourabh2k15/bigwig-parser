$(document).ready(function(){
	console.log("app ready");
	console.log(jszlib_inflate_buffer);
	$('#f').change(function(){
		file= this.files[0];
		if(!file) return;
		makeBigWig(file,function(d,e){
			if(d==null) console.log(e);
			else console.log(d);
		},"mytrack");
	});
});

//utilities
function log(m){
	console.log(m);
}

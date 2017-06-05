function dataHolder(b){
	this.blob = b;
}

dataHolder.prototype.salted = function(){ return this;}

dataHolder.prototype.slice = function(start,length){
	var b;

	if(this.blob.slice){
		if(length){
			b = this.blob.slice(start,start+length);
		}
		else b = this.blob.slice(start);
	}
	else{
		log("blob doesn't have slice prop");
	}

	return new dataHolder(b);
}

dataHolder.prototype.fetch = function(cb1){
	var r = new FileReader;
	r.onloadend = function(){
		cb1(r.result);
	}
	r.readAsArrayBuffer(this.blob);
}

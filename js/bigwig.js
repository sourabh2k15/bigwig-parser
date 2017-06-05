// constants : bigwig/bigbed file header signatures (magic numbers) (32 bit) , can be swapped ( big-endian | BE )
var BIG_WIG_MAGIC = 0x888FFC26;
var BIG_WIG_MAGIC_BE = 0x26FC8F88;

var BIG_BED_MAGIC = 0x8789F2EB;
var BIG_BED_MAGIC_BE = 0xEBF28987;

var CIRTREE_MAGIC = 0x78ca8c91;
var IDXTREE_MAGIC = 0x2468ace0;

//type of file converted to bigwig bedgraph |variable step wiggle | fixed step wiggle
var BIG_WIG_TYPE_GRAPH = 1;
var BIG_WIG_TYPE_VSTEP = 2;
var BIG_WIG_TYPE_FSTEP = 3;

//bigbed data color
var BED_COLOR_REGEXP = new RegExp("^[0-9]+,[0-9]+,[0-9]+");

var M1=1<<8;
var M2=M1<<8;
var M3=M2<<8;
var M4=M3<<8;
var M5=M4<<8;
var M6=M5<<8;
var M7=M6<<8;


function BigWig(f,cb,name){
	this.data = new dataHolder(f);
	this.name = name;
	this.cb = cb;
	this.init();
}

BigWig.prototype.init = function(){
	/*
		passing <this> as param so callback can be called with that context and <this> is preserved to BigWig class
		or else <this> would refer to dataHolder class.

		another way to do this is preserving it in a variable and using it as we use <this>
		var s = this; then inside fetch() -> s.method() //s would now be our bigwig object, this being dataHolder
	*/
	this.getData(0,-1,this,this.process);
}

BigWig.prototype.getData = function(s,e,t,cb){
	this.data.slice(s,e).salted().fetch(function(data){
		cb.call(t,data);
	});
}

BigWig.prototype.process = function(data){
	if(!data) this.cb(null,"error fetching data");

	this.parseData(data);
	if(this.checkSignature()!=0) return this.cb(null,this.error);
	this.readHeader();	//reading 64byte header
	if(this.readChromTree()!=0) return this.cb(null,this.error);

	console.log("processing R tree !!!!!!!");
	this.readRTreeIndex(); // gets root node index after processing header, it is always 48 after R-tree indexOffset
	this.root = this.getRTreeNode();
	return this.cb(this);
}

BigWig.prototype.getValues = function(chrom, start, end,cb){
	this.cb2 = cb;
	var chromid = this.chroms.indexOf(chrom);
	var blocks  = this.walkRTreeNodes(this.root,chromid,start,end);
	this.processBlocks(blocks,chromid,start,end);
}

BigWig.prototype.processBlocks = function(blocks,chromid,ostart,oend){
	var totalSize = 0;
	var base = blocks.offset[0];
	for(var i=0;i<blocks.n;i++) totalSize+=blocks.size[i];

	if(totalSize%4!=0) totalSize+=(4-totalSize%4); //make it a multiple of 4 so Float32Array doesn't complain

	this.getData(base,totalSize,this,function(data){
		var values = [];
		for(var i=0;i<blocks.n;i++){
			var sb = blocks.offset[i]-base+blocks.size[i];
			if(sb%4 != 0) sb = sb+4-(sb%4);
			var b = data.slice(blocks.offset[i]-base,sb)

			if(this.compressed){
				b = jszlib_inflate_buffer(b,2,blocks.size[i]-2);
			}

			var ba = new Uint8Array(b);
			var fa = new Float32Array(b);

			var chromid = read32Bit(ba,0);
			var start = read32Bit(ba,4);
			var end = read32Bit(ba,8);
			var step = read32Bit(ba,12);
			var span = read32Bit(ba,16);
			var type = read8Bit(ba,20);
			var nItems = read16Bit(ba,22);
			var ranges = this.readValues(type,nItems,blocks,ba,fa,span,ostart,oend);
			values = values.concat(ranges);
		}
		return this.cb2(values);
	});
}

BigWig.prototype.readValues = function(blocktype,items,blocks,ba,fa,span,ostart,oend){
	var values = [];
	if(this.type=="bigwig"){
		console.log("processing bigwig");

		for(var i=0;i<items;i++){
			if(blocktype==BIG_WIG_TYPE_VSTEP){
				var s = read32Bit(ba,24+2*i)+1;
				var e = s+span-1;
				var v = readfloat(fa,7+2*i);
				//console.log(s,v);
				if(s>oend || e<ostart) continue;
				values.push([s,e,v]);
			}
			else if(blocktype==BIG_WIG_TYPE_FSTEP){
				console.log("fixed step");
			}
			else if(blocktype==BIG_WIG_TYPE_GRAPH){
				console.log("graph");
			}
			else{
				console.log("blocktype not recognized");
			}
		}
	}
	else if(this.type=="bigbed"){
		console.log("processing bigbed blocks");
	}
	return values;
}
BigWig.prototype.walkRTreeNodes = function(root,chromid,start,end){
	if(root.isLeaf) return this.overlapsLeaf(root,chromid,start,end);
	else return this.overlapsNonLeaf(root,chromid,start,end);
}

BigWig.prototype.overlapsNonLeaf = function(node,chromid,start,end){
	console.log("this is a index ");
	var output = {};
	var nodeBlocks = {};

	for(var i=0;i<node.nChildren;i++){
		if(chromid < node.chrIdxStart[i]) break;
		if(chromid < node.chrIdxStart[i] || chromid > node.chrIdxEnd[i]) continue; // Is this correct ? seems crazy to me !
		// only god and the guy who wrote libBigWig know why after 1st if-break the same condition be satisfied in any latter if
		// have created a PR for now -> https://github.com/dpryan79/libBigWig/pull/27
		if(node.chrIdxStart[i] != node.chrIdxEnd[i]){
			if(chromid==node.chrIdxStart[i]){
				if(node.baseStart[i]>=end) break;
			}
			else if(chromid==node.chrIdxEnd[i]){
				if(node.baseEnd[i]<=start) continue;
			}
		}
		else{
			if( start > node.baseEnd[i] || end <node.baseStart[i]) continue;
		}

		//found an overlap , recurse to child node
		if(!node.x.child[i]) node.x.child[i] = this.getRTreeNode(node.dataOffset[i]);

		if(node.x.child[i].isLeaf){
			nodeBlocks = this.overlapsLeaf(node.x.child[i],chromid,start,end);
		}else{
			nodeBlocks = this.overlapsNonLeaf(node.x.child[i],chromid,start,end);
		}
		output = this.mergeBlocks(output,nodeBlocks);
	}
	return output;
}

BigWig.prototype.overlapsLeaf = function(node,chromid,start,end){
	console.log("its a leaf");
	var output = {};
	var offset = [];
	var size = [];
	var n=0;

	for(var i=0;i<node.nChildren;i++){
		if(chromid<node.chrIdxStart[i]) break; // stop processing children as it is a sorted list , so no scope further
		if(chromid < node.chrIdxStart[i] || chromid>node.chrIdxEnd[i]) continue; // continue looking in next childrean , cause they could contain chromid

		if(node.chrIdxStart[i] != node.chrIdxEnd[i]){
			if(chromid==node.chrIdxStart[i]){
				if(node.baseStart[i]>=end) break;
			}
			else if(chromid==node.chrIdxEnd[i]){
				if(node.baseEnd[i]<=start) continue;
			}
		}
		else{
			if(node.baseStart[i]>=end || node.baseEnd[i]<=start){
				 continue;
			 }
		}

		//found an overlap
		offset.push(node.dataOffset[i]);
		size.push(node.x.size[i]);
		n++;
	}
	output.n = n;
	output.offset = offset;
	output.size = size;
	return output;
}

BigWig.prototype.mergeBlocks = function(o1,o2){
	//console.log(o1,o2);
	if(!o2) return o1;
	if(!o1.n) return o2;
	if(!o2.n) return o1;
	var j = o1.n;
	o1.n += o2.n;
	for(var i=0;i<o2.n;i++){
		o1.offset[j+i] = o2.offset[i];
		o1.size[j+i] = o2.size[i];
	}
	return o1;
}

BigWig.prototype.parseData = function(data){
	this.ba = new Uint8Array(data); //8bit array | each index contains 1 byte
	this.pos = 0;
}

//checking file signature, helps to validate files and detect bigbed / bigwig
// returns object with error prop set 0 if no error or an error message if error
BigWig.prototype.checkSignature = function(header){
	var magic = this.read32Bit();
	this.magic = magic;

	if(magic == BIG_WIG_MAGIC) this.type = "bigwig";
	else if(magic==BIG_BED_MAGIC) this.type = "bigbed";
	else if(magic == BIG_WIG_MAGIC_BE || magic == BIG_BED_MAGIC_BE){
		this.error = "big-endian BBI files not supported";return -1;
	}
	else {this.error = "unsupported file format"; return -1;}

	return 0 //all is well
}

BigWig.prototype.readHeader = function(header,t){
	//reading header of 64 bytes / 64*8=512 bits
	/*
		fixedWidthHeader (64bytes == 512 bits)
   		*         magic# 		        4 bytes
   		*         version               2 bytes
   		*	      zoomLevels		    2 bytes
   		*         chromosomeTreeOffset	8 bytes
   		*         fullDataOffset	    8 bytes
   		*	      fullIndexOffset	    8 bytes
   		*         fieldCount            2 bytes (for bigWig 0)
   		*         definedFieldCount     2 bytes (for bigWig 0)
   		*         autoSqlOffset         8 bytes (for bigWig 0) (0 if no autoSql information)
   		*         totalSummaryOffset    8 bytes (0 in earlier versions of file lacking totalSummary)
   		*         uncompressBufSize     4 bytes (Size of uncompression buffer.  0 if uncompressed.)
   		*         extensionOffset       8 bytes (Offset to header extension 0 if no such extension)
	*/
	var t = this; // cause I am lazy and the code looks better this way :)

	t.version = t.read16Bit();
	t.zoomLevels = t.read16Bit();
	t.chromTreeOffset = t.read64Bit();
	t.dataOffset = t.read64Bit();
	t.indexOffset = t.read64Bit();
	t.fieldCount = t.read16Bit();
	t.definedFieldCount = t.read16Bit();
	t.autoSQLoffset = t.read64Bit();
	t.totalSummaryOffset = t.read64Bit();
	t.uncompressBufSize = t.read32Bit();
	if(t.uncompressBufSize>0) t.compressed = true;
	t.extHeaderOffset = t.read64Bit();
	t.zoomHeaders = [];

	for(var i=0;i<t.zoomLevels;i++){
		var zReduction = t.read32Bit();
		t.read32Bit(); // reserved
		var zdOffset    = t.read64Bit();
		var zIOffset    = t.read64Bit();
		t.zoomHeaders.push({reductionLevel :zReduction, dataOffset:zdOffset, indexOffset:zIOffset});
	}
}

// traverses the B+ tree to get the chromosome ids and names , the ids are used in the R tree intervals
BigWig.prototype.readChromTree = function(){
	this.seek(this.chromTreeOffset);
	var magic = this.read32Bit();

	if(magic == CIRTREE_MAGIC){
		// cirTree located !
		/*
			cirTree is a  B+tree
			this B+ tree stores chrom->ID mapping ( to save space )
			while R-tree stores [ID,start.stop,values] ( values we actually desire to extract )
		*/
		console.log("cirTree located");
		//parsing the B+tree header
		var itemsPerBlock = this.read32Bit();
		var keySize = this.read32Bit();
		var valueSize = this.read32Bit();
		var itemCount = this.read64Bit();
		this.seek(this.pos+8); //skipping 8 bytes for padding

		this.nKeys = itemCount; // total number of values in the tree
		this.chroms = new Array(itemCount);
		this.lengths = new Array(itemCount);
		this.keySize = keySize;
		this.valueSize = valueSize;
		this.itemsPerBlock = itemsPerBlock;

		var i=0;

		while(i<itemCount){
			var rv = this.readChromBlock(); //traverses the B+tree till leaves and gets values
			i+=rv;
		}
		return 0
	}
	else{
		this.error = "cirTree offset doesn't contain tree :(";
		return -1
	}
}

BigWig.prototype.readChromBlock = function(){
	var isLeaf = this.read8Bit();
	this.read8Bit();// 1byte of padding

	if(isLeaf){
		console.log("leaf node");
		this.readChromLeaf();
	}
	else{
		console.log("index node");
		this.readChromNonLeaf();
	}
}

BigWig.prototype.readChromNonLeaf = function(){
	var rv = 0;
	this.seek(this.pos+this.keySize);
	var nVals = this.read16Bit();

	for(var i=0;i<nVals;i++){
		var childOffset = this.read64Bit();
		this.seek(this.pos+childOffset);
		rv += this.readChromBlock();
	}
	return rv;
}

BigWig.prototype.readChromLeaf = function(){
	var nVals = this.read16Bit(); //number of values in node
	var idx,len;

	for(var i=0;i<nVals;i++){
		var chrom = "";
		//read keysize bytes to get chromosome name
		for(var j=0;j<this.keySize;++j){
			var c = this.read8Bit();
			if(c != 0)
			chrom+= String.fromCharCode(c);
		}
		//get chromosome index
		idx = this.read32Bit();
		this.chroms[idx] = chrom;
		this.lengths[idx] = this.read32Bit(); //chrom lengths

		if(!this.maxID) this.maxID = 0;
		this.maxID = Math.max(this.maxID, idx); //max chrom id
	}
	return nVals;
}

BigWig.prototype.readRTreeIndex = function(){
	console.log("parsing R tree index");
	var idx = this.indexOffset;
	this.seek(idx);
	var magic = this.read32Bit();
	var Rheader = {};

	console.log(magic,IDXTREE_MAGIC);
	if(magic==IDXTREE_MAGIC){
		console.log("RTree found!");
		//header of R tree , right now not of use and is redundant
		Rheader.blockSize = this.read32Bit();
		Rheader.nItems = this.read64Bit();
		Rheader.chrIdxStart = this.read32Bit();
		Rheader.baseStart = this.read32Bit();
		Rheader.chrIdxEnd = this.read32Bit();
		Rheader.baseEnd = this.read32Bit();
		Rheader.idxSize = this.read64Bit();
		Rheader.nItemsPerSlot = this.read32Bit();

		this.read32Bit(); //padding

		// the most imp index
		this.rheader = Rheader;
		this.rootOffset = this.pos;
	}else{
		console.log("RTree not found :(");
	}
}
BigWig.prototype.getRTreeNode = function(offset){
	if(!offset)	this.seek(this.rootOffset);
	else this.seek(offset);

	var node = {};

	node.isLeaf = this.read8Bit();
	this.read8Bit(); // padding
	node.nChildren = this.read16Bit();

	node.chrIdxStart = new Array(node.nChildren);
	node.baseStart = new Array(node.nChildren);
	node.chrIdxEnd = new Array(node.nChildren);
	node.baseEnd = new Array(node.nChildren);
	node.dataOffset = new Array(node.nChildren);
	node.x = {};

	if(node.isLeaf){
		node.x.size = new Array(node.nChildren);
	} else {
		node.x.child = new Array(node.nChildren);
	}

	for(var i=0;i<node.nChildren;i++){
		node.chrIdxStart[i] = this.read32Bit();
		node.baseStart[i] = this.read32Bit();
		node.chrIdxEnd[i] = this.read32Bit();
		node.baseEnd[i] = this.read32Bit();
		node.dataOffset[i] = this.read64Bit();

		if(node.isLeaf){
			node.x.size[i] = this.read64Bit();
		}
	}

	return node;
}

//reads 8 bytes from data
BigWig.prototype.read64Bit = function(){
		var ba = this.ba;
		var o = this.pos;
		var val = ba[o] + ba[o+1]*M1 + ba[o+2]*M2 + ba[o+3]*M3 + ba[o+4]*M4 + ba[o+5]*M5 + ba[o+6]*M6 + ba[o+7]*M7;
		this.pos = o+8;
	    return val;
}

BigWig.prototype.show64Bit = function(){
	var ba = this.ba;
	var o = this.pos;
	console.log(ba[o],ba[o+1],ba[o+2],ba[o+3],ba[o+4],ba[o+5],ba[o+6],ba[o+7]);
}

//reads 4bytes from data
BigWig.prototype.read32Bit = function(){
	var o = this.pos;
	var ba = this.ba;
	this.pos = o+4;
	var a = ba[o], b = ba[o+1],c=ba[o+2],d= ba[o+3];
	var r = (a | ((b<<8)>>>0) | ((c<<16)>>>0) | ((d<<24)>>>0))>>>0;
	return r;
}

//reads 2 bytes from data
BigWig.prototype.read16Bit = function(){
	var o = this.pos;
	var ba = this.ba;
	this.pos = o+2;
	return (ba[o])|(ba[o+1]<<8);
}

//reads 1 byte from data
BigWig.prototype.read8Bit = function(){
	return this.ba[this.pos++];
}

// sets the starting position to pos, so data can be read from there onwards.
BigWig.prototype.seek = function(pos){
	this.pos = pos;
}

function makeBigWig(f,cb,name){
	var bwg = new BigWig(f,cb,name);
}

var read32Bit = function(ba,o){
		var a = ba[o], b = ba[o+1],c=ba[o+2],d= ba[o+3];
		var r = (a | ((b<<8)>>>0) | ((c<<16)>>>0) | ((d<<24)>>>0))>>>0;
		return r;
}
var read16Bit = function(ba,o){
		return (ba[o]|((ba[o+1]<<8)>>>0));
}
var read8Bit = function(ba,o){
		return ba[o];
}
var readfloat = function(fa,o){
		return fa[o];
}

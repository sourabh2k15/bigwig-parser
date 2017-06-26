$(document).ready(function(){
	console.log("app ready!");
	checkURL();

	$('#fp').change(function(){
		console.log("file uploaded");
		var fp = this.files[0];
		makeBigWig(fp);
	});
});

function makeBigWig(fp){
	makeBwg(new BlobFetchable(fp),function(d,e){
		if(d==null) console.log(e);
		else{
			 console.log(d);
			 d.readWigData("chr1" ,0, 500000,function(data){
				 console.log(data);
			 });
		}
	},"sourabhtrack");
}

function checkURL(){
	console.log("check URL");
	var t = performance.now();
	var url = "http://ftp.ebi.ac.uk/pub/databases/blueprint/data/homo_sapiens/GRCh38/venous_blood/C000S5/CD14-positive_CD16-negative_classical_monocyte/ChIP-Seq/NCMLS/C000S5H2.ERX547982.H3K9me3.bwa.GRCh38.20150528.bw";
	url = "http://ftp.ebi.ac.uk/pub/databases/blueprint/data/homo_sapiens/GRCh38/venous_blood/C006G5/cytotoxic_CD56-dim_natural_killer_cell/Bisulfite-Seq/CNAG/C006G551.hypo_meth.bs_call.GRCh38.20150707.bb";
	url = "http://ftp.ebi.ac.uk/pub/databases/blueprint/data/homo_sapiens/GRCh38/bone_marrow/BM220513/band_form_neutrophil/ChIP-Seq/NCMLS/S00G11H1.ERX651349.H3K4me3.bwa.GRCh38.20150528.bw";
	url = "http://ftp.ebi.ac.uk/pub/databases/blueprint/data/homo_sapiens/GRCh38/bone_marrow/22965/Multiple_Myeloma/ChIP-Seq/NCMLS/S00XCMH1.ERX712720.H3K27ac.bwa.GRCh38.20150529.bw";
	url = "http://ftp.ebi.ac.uk/pub/databases/blueprint/data/homo_sapiens/GRCh38/venous_blood/191CLL/Chronic_Lymphocytic_Leukemia/ChIP-Seq/NCMLS/S01QE1H1.ERX1304193.H3K27ac.bwa.GRCh38.20160226.bw";
	url = "http://ftp.ebi.ac.uk/pub/databases/blueprint/data/homo_sapiens/GRCh38/bone_marrow/pz_289/Acute_Promyelocytic_Leukemia_-_CTR/ChIP-Seq/NCMLS/S008QKH1.ERX406911.Input.bwa.GRCh38.20150528.bw";
	makeBwg(new URLFetchable(url), function(d,e){
		if(d == null) console.log(e);
		else{
			 console.log(d);
			 var e = performance.now();
			 console.log("took "+(e-t));
			 d.readWigData("chr1", 0, 50000000,function(data){
				 console.log(data);
				 e = performance.now();
				 console.log("took "+(e-t));
			 });
		}
	});
}

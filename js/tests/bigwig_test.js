describe('BigWig Parser', function() {
	var bb, bb2;

	it('can be created by connecting to a URL', function(done){
		var bbURI = 'http://ftp.ebi.ac.uk/pub/databases/blueprint/data/homo_sapiens/GRCh38/venous_blood/191CLL/Chronic_Lymphocytic_Leukemia/ChIP-Seq/NCMLS/S01QE1H1.ERX1304193.H3K27ac.bwa.GRCh38.20160226.bw';
		new BigWig2(bbURI, "test track", true, function(_bb, _err){
			bb = _bb;
			expect(bb).not.toBeNull();
			done();
		});
	});

});

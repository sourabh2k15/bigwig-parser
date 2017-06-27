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

	it('parses file header correctly', function(done){
		var bbURI = 'http://ftp.ebi.ac.uk/pub/databases/blueprint/data/homo_sapiens/GRCh38/bone_marrow/23977/Multiple_Myeloma/ChIP-Seq/NCMLS/S00XEIH1.ERX1007374.H3K9me3.bwa.GRCh38.20151029.bw';

		new BigWig2(bbURI, "test track", true, function(_bb, _err){
			bb = _bb;
			makeBwg(bbURI, "test track", true, function(_b,_e){
				bb2 = _b;
				expect(bb.type).toEqual(bb2.type);
				expect(bb.version).toEqual(bb2.version);
				expect(bb.chromTreeOffset).toEqual(bb2.chromTreeOffset);
				expect(bb.unzoomedIndexOffset).toEqual(bb2.unzoomedIndexOffset);
				expect(bb.unzoomedDataOffset).toEqual(bb2.unzoomedDataOffset);
				expect(bb.numZoomLevels).toEqual(bb2.numZoomLevels);
				done();
			});
		});
	});

	it('queries file values correctly',function(done){
		var low = 0, high = 500000;
		bb.getValues(bb.chroms[0], low, high, function(data1, err){
			bb2.readWigData(bb.chroms[0], low, high, function(data2){
				expect(data1.length).toEqual(data2.length);
				expect(data1[])
			});
			done();
		})
	});

});

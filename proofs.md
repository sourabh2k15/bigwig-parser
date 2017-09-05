Hello steve, 

Below are the track configurations and the resulting outputs as compared in Genoverse and Ensembl to convince you that the code is working :) 

1) BIGBED :

```
  chr       : 17,
  start     : 64155265,
  end       : 64255266,

  Genoverse.Track.File.BIGWIG.extend({
    name : 'encode-bigwig-demo',
    url  : 'http://ftp.ensembl.org/pub/data_files/homo_sapiens/GRCh38/result_set/086/ersa_signal/bigwig/GM10847_NFKB_ChIP-Seq_ENCODE86_bwa_samse.bw',
  })

```
![BIGWIG-ensembl](http://i.imgur.com/OVV7TV9.png)

![BIGWIG-genoverse](http://i.imgur.com/K1abowQ.png) 
  
  The zoom levels are different and the renderings are a bit different but the feature data parsed is same in both as
  shown by the single feature focused on `17:64145999` 
  
  
  2) VCF.GZ: 
  
  ```
  chr       : 13,
  start     : 32585503,
  end       : 32589153,

  Genoverse.Track.File.VCF.extend({
    name : 'vcf-demo',
    url  : 'http://ftp.ensembl.org/pub/data_files/homo_sapiens/GRCh38/variation_genotype/ALL.chr13.phase3_shapeit2_mvncall_integrated_v3plus_nounphased.rsID.genotypes.GRCh38_dbSNP.vcf.gz',
    gz   : true,
  })
  ```  
  
  ![VCF.GZ-ensembl](http://i.imgur.com/e03PDwY.png)
  
  ![VCF.GZ-genoverse](http://i.imgur.com/bPHyluF.png)
  
  13:32587797 feature is zoomed on, the data matches perfectly though it can be a while before the data appears in the genoverse track
  as it is making more network requests, this needs to be improvised upon but it works perfectly from the output point of view

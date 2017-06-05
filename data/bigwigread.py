"""
usage: %prog bigwig_file.bw  < bed_file.bed
"""
from bx.intervals.io import GenomicIntervalReader
from bx.bbi.bigwig_file import BigWigFile
import numpy as np
import time
import sys

bw = BigWigFile( open( sys.argv[1] ) )
ll = []
for interval in GenomicIntervalReader( sys.stdin ):
    start = time.time()
    bw.query(interval.chrom, interval.start, interval.end, 20 )
    total = time.time() - start
    ll.append(total)

print np.mean(ll)

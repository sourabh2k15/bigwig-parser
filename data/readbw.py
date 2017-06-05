import pyBigWig
bw = pyBigWig.open("ensGene.bb")

print bw.isBigWig()
print bw.chroms()

print bw.entries("chr22",29807305,29830609)

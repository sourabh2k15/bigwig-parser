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

// URL fetchable

function URLFetchable(url, start, end, opts) {
    if (!opts) {
        if (typeof start === 'object') {
            opts = start;
            start = undefined;
        } else {
            opts = {};
        }
    }

    this.url = url;
    this.start = start || 0;
    if (end) {
        this.end = end;
    }
    this.opts = opts;
}

URLFetchable.prototype.slice = function(s, l) {
    if (s < 0) {
        throw 'Bad slice ' + s;
    }

    var ns = this.start, ne = this.end;
    if (ns && s) {
        ns = ns + s;
    } else {
        ns = s || ns;
    }
    if (l && ns) {
        ne = ns + l - 1;
    } else {
        ne = ne || l - 1;
    }
    return new URLFetchable(this.url, ns, ne, this.opts);
}

//WIP: trying to write a simpler version of fetch()
URLFetchable.prototype.fetch2 = function(cb){
	$.ajax({
		url : this.url,
		type: 'GET',
		headers: {Range: "bytes="+this.start+"-"+this.end},
		processData:false,
		responseType: 'ArrayBuffer',
		success: function(data){
			cb(data);
		}
	});
}

URLFetchable.prototype.getURL = function() {
    if (this.opts.resolver) {
        return this.opts.resolver(this.url).then(function (urlOrObj) {
            if (typeof urlOrObj === 'string') {
                return urlOrObj;
            } else {
                return urlOrObj.url;
            }
        });
    } else {
        return Promise.resolve(this.url);
    }
}

URLFetchable.prototype.fetch = function(callback, opts) {
    var thisB = this;

    opts = opts || {};
    var attempt = opts.attempt || 1;
    var truncatedLength = opts.truncatedLength;
    if (attempt > 3) {
        return callback(null);
    }

    this.getURL().then(function(url) {
        try {
            var timeout;
            if (opts.timeout && !thisB.opts.credentials) {
                timeout = setTimeout(
                    function() {
                        console.log('timing out ' + url);
                        req.abort();
                        return callback(null, 'Timeout');
                    },
                    opts.timeout
                );
            }

            var req = new XMLHttpRequest();
            var length;

            req.open('GET', url, true);
            req.overrideMimeType('text/plain; charset=x-user-defined');
            if (thisB.end) {
                if (thisB.end - thisB.start > 100000000) {
                    throw 'Monster fetch!';
                }
                req.setRequestHeader('Range', 'bytes=' + thisB.start + '-' + thisB.end);
                length = thisB.end - thisB.start + 1;
            }
            req.responseType = 'arraybuffer';
            req.onreadystatechange = function() {
                if (req.readyState == 4) {
                    if (timeout)
                        clearTimeout(timeout);
                    if (req.status == 200 || req.status == 206) {
                        if (req.response) {
                            var bl = req.response.byteLength;
                            if (length && length != bl && (!truncatedLength || bl != truncatedLength)) {
                                return thisB.fetch(callback, {attempt: attempt + 1, truncatedLength: bl});
                            } else {
                                return callback(req.response);
                            }
                        } else if (req.mozResponseArrayBuffer) {
                            return callback(req.mozResponseArrayBuffer);
                        } else {
                            var r = req.responseText;
                            if (length && length != r.length && (!truncatedLength || r.length != truncatedLength)) {
                                return thisB.fetch(callback, {attempt: attempt + 1, truncatedLength: r.length});
                            } else {
                                return callback(bstringToBuffer(req.responseText));
                            }
                        }
                    } else {
                        return thisB.fetch(callback, {attempt: attempt + 1});
                    }
                }
            };
            if (thisB.opts.credentials) {
                req.withCredentials = true;
            }
            req.send();
        } catch (e) {
            return callback(null);
        }
    }).catch(function(err) {
        console.log(err);
        return callback(null, err);
    });
}

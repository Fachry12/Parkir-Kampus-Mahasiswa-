/* ParkirKampus: QR engine (local) */
/*
 * Local QR generator adapted from qrcode-terminal's vendored QRCode implementation.
 * Original QRCode implementation by Kazuhiko Arase; MIT license.
 * Used here to generate demo tickets locally without sending ticket details to an external service.
 */
(function (global) {
  'use strict';
  var modules = Object.create(null);
  var cache = Object.create(null);
modules['./QR8bitByte'] = function(require, module, exports) {
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

};
modules['./QRBitBuffer'] = function(require, module, exports) {
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

};
modules['./QRErrorCorrectLevel'] = function(require, module, exports) {
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


};
modules['./QRMaskPattern'] = function(require, module, exports) {
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

};
modules['./QRMath'] = function(require, module, exports) {
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

};
modules['./QRMode'] = function(require, module, exports) {
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

};
modules['./QRPolynomial'] = function(require, module, exports) {
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

};
modules['./QRRSBlock'] = function(require, module, exports) {
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

};
modules['./QRUtil'] = function(require, module, exports) {
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

};
modules['./index'] = function(require, module, exports) {
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

};
  function load(id) {
    if (cache[id]) return cache[id].exports;
    if (!modules[id]) throw new Error('QR module not found: ' + id);
    var module = { exports: {} };
    cache[id] = module;
    modules[id](function (child) { return load(child); }, module, module.exports);
    return module.exports;
  }
  global.ParkirQr = {
    QRCode: load('./index'),
    CorrectLevel: load('./QRErrorCorrectLevel')
  };
})(window);

// JavaScript untuk aplikasi ParkirKampus
'use strict';

/*
 * PENGATURAN DEMO
 * Sesuaikan zona waktu dan data contoh dengan kampus yang digunakan.
 * Login, data parkir, dan validasi QR masih berjalan secara lokal.
 */
// Zona waktu kampus.
const CAMPUS_TIME_ZONE = 'Asia/Jakarta';
// Link bantuan kampus bisa diisi di sini.
const HELPDESK_URL = ''; // Isi dengan tautan resmi kampus saat sudah tersedia.
const DEMO_LICENSE_PLATE = 'L 1234 AB';
function ambil(id) {
  return document.getElementById(id);
}
const DEMO_SESSION_STORAGE_KEY = 'parkirkampus.demo.session.v1';


// Mengatur riwayat halaman supaya tombol kembali bisa dipakai.
// Gunakan hash URL sebagai fallback agar navigasi tetap berfungsi.
function safeHistoryReplace(state, url) {
  try {
    history.replaceState(state, '', url);
    return true;
  } catch (error) {
    return false;
  }
}
function safeHistoryPush(state, url, route) {
  try {
    history.pushState(state, '', url);
    return true;
  } catch (error) {
    if (route) location.hash = route;
    return false;
  }
}

/*
 * STATUS APLIKASI
 * Nilai-nilai ini dipakai untuk memperbarui dashboard dan halaman detail.
 * Password tidak disimpan ke variabel sesi ataupun sessionStorage.
 */
const CAMPUS_TIME_LABELS = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' };
const CAMPUS_TIME_LABEL = CAMPUS_TIME_LABELS[CAMPUS_TIME_ZONE] || 'Waktu kampus';
let parkingEntryTime = new Date(Date.now() - 86 * 60000);
let parkingExitTime = null;
let durationInterval = null;
let toastTimeout = null;
let ticketSequence = 1;
let currentTicketCode = createTicketCode(parkingEntryTime, ticketSequence);
let lastFocusedElement = null;
let currentDialogId = null;
let originalBodyOverflow = '';
let signedInSsoAccount = '';
const requestedInitialFeature = ['location','motor','time','qr'].includes(location.hash.slice(1)) ? location.hash.slice(1) : null;
// Simpan fitur yang diminta dari URL sebelum riwayat browser diatur ulang.
safeHistoryReplace({ parkirView: 'home' }, location.pathname + location.search);

/*
 * INFORMASI MENU
 * Judul dan deskripsi setiap halaman disimpan di satu tempat supaya mudah diubah.
 */
const featureConfig = {
  location: { title: 'Lokasi Parkir', subtitle: 'Cari tahu area dan slot tempat motor kamu diparkir.' },
  motor: { title: 'Info Kendaraan', subtitle: 'Lihat detail motor dan lokasi parkir terakhir yang tercatat.' },
  time: { title: 'Waktu Parkir & Keluar', subtitle: 'Cek waktu masuk, durasi parkir, dan waktu keluar.' },
  qr: { title: 'QR Keluar', subtitle: 'Siapkan QR ini saat akan meninggalkan area kampus.' }
};

// Membantu membuat tanggal tiket dan waktu yang konsisten dengan zona kampus.
function getDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}
function createTicketCode(date, sequence) {
  const parts = getDateParts(date);
  return `PK-${parts.year}${parts.month}${parts.day}-${String(sequence).padStart(3, '0')}`;
}
function formatTime(date) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: CAMPUS_TIME_ZONE
  }).format(date);
}
function formatDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: CAMPUS_TIME_ZONE
  }).format(date);
}
function formatDateTime(date) {
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: CAMPUS_TIME_ZONE
  }).format(date);

  return `${formattedDate} · ${CAMPUS_TIME_LABEL}`;
}
function getMinutesBetween(start, end) {
  return Math.max(0, Math.floor((end - start) / 60000));
}
function formatDuration(start, end) {
  const totalMinutes = getMinutesBetween(start, end);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}j ${String(minutes).padStart(2, '0')}m`;
}
// Menyimpan data demo di browser.
function saveDemoSessionState() {
  try {
    const shouldRememberSession = ambil('rememberDevice').checked;

    if (!shouldRememberSession || !signedInSsoAccount) {
      sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify({
      account: signedInSsoAccount,
      entryTime: parkingEntryTime.toISOString(),
      exitTime: parkingExitTime ? parkingExitTime.toISOString() : null,
      sessionSequence: ticketSequence
    }));
  } catch (error) {
    // Private browsing or restricted storage should not prevent the demo from working.
  }
}
// Mengambil nama dari akun yang dimasukkan.
function getDisplayNameFromSso(account) {
  // Demo-only: SSO production normally returns the real display name from the campus identity provider.
  const username = String(account || '').trim().split('@')[0];
  const words = username
    .replace(/[0-9]+/g, ' ')
    .replace(/[._-]+/g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length) {
    return words
      .slice(0, 3)
      .map(word => {
        const firstLetter = word.charAt(0).toLocaleUpperCase('id-ID');
        const remainingLetters = word.slice(1).toLocaleLowerCase('id-ID');
        return firstLetter + remainingLetters;
      })
      .join(' ');
  }
  const digits = String(account || '').replace(/\D/g, '');
  return digits ? 'Mahasiswa ' + digits.slice(-4) : 'Mahasiswa';
}
function updateStudentProfile(account) {
  signedInSsoAccount = account;
  const displayName = getDisplayNameFromSso(account);
  const accountName = account.split('@')[0];
  const initial = displayName.replace(/[^\p{L}]/gu, '').charAt(0) || 'M';

  ambil('profileName').textContent = displayName;
  ambil('profileAccount').textContent = 'SSO: ' + accountName;
  ambil('homeTitle').textContent = `Halo, ${displayName}!`;
  ambil('avatarInitial').textContent = initial.toLocaleUpperCase('id-ID');
}
// Mengecek apakah ada sesi demo yang tersimpan.
function restoreDemoSessionState() {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);

    if (!saved || typeof saved !== 'object') {
      sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      return false;
    }

    const savedEntry = new Date(saved.entryTime);
    const savedExit = saved.exitTime ? new Date(saved.exitTime) : null;
    const savedAccount = typeof saved.account === 'string' ? saved.account : saved.nim;

    const hasValidAccount = typeof savedAccount === 'string' && savedAccount.trim().length > 0;
    const hasValidEntryTime = !Number.isNaN(savedEntry.getTime());
    const hasValidExitTime = !savedExit || !Number.isNaN(savedExit.getTime());

    if (!hasValidAccount || !hasValidEntryTime || !hasValidExitTime) {
      sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      return false;
    }
    signedInSsoAccount = savedAccount;
    parkingEntryTime = savedEntry;
    parkingExitTime = savedExit;
    ticketSequence = Number.isInteger(saved.sessionSequence) && saved.sessionSequence > 0
      ? saved.sessionSequence
      : 1;
    currentTicketCode = createTicketCode(parkingEntryTime, ticketSequence);
    ambil('rememberDevice').checked = true;
    updateStudentProfile(signedInSsoAccount);
    ambil('loginScreen').classList.add('hidden');
    ambil('appScreen').classList.remove('hidden');
    renderTicketQr();
    updateParkingSessionUI();
    startDurationTimer();
    return true;
  } catch (error) {
    return false;
  }
}
function showToast(message) {
  const element = ambil('toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => element.classList.remove('show'), 2800);
}
// Membuat QR Code untuk tiket parkir.
function renderTicketQr() {
  const qr = new ParkirQr.QRCode(0, ParkirQr.CorrectLevel.M);
  // Tidak menyimpan NIM/nama mahasiswa di QR. Isinya hanya kode tiket demo.
  qr.addData(`KAMPUS-PARKIR|DEMO|TICKET-${currentTicketCode}|AKSES-KELUAR`);
  qr.make();
  const count = qr.getModuleCount();
  const quietZone = 4;
  const pixelPerModule = 8;
  const side = (count + quietZone * 2) * pixelPerModule;
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext('2d');
  if (!context) {
    showToast('QR tidak dapat dibuat pada browser ini. Coba browser lain.');
    return;
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, side, side);
  context.fillStyle = '#102b49';
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) {
        context.fillRect((col + quietZone) * pixelPerModule, (row + quietZone) * pixelPerModule, pixelPerModule, pixelPerModule);
      }
    }
  }
  const qrUrl = canvas.toDataURL('image/png');
  ambil('qrImage').src = qrUrl;
  // Satu gambar QR digunakan ulang di tampilan besar agar tidak menggandakan data.
  ambil('modalQrImage').src = ambil('qrImage').src;
  ambil('qrTicketCode').textContent = currentTicketCode;
  ambil('modalTicketCode').textContent = currentTicketCode;
}
// Memperbarui informasi parkir yang tampil di halaman.
function updateParkingSessionUI() {
  const now = parkingExitTime || new Date();
  const durationText = formatDuration(parkingEntryTime, now);
  ambil('timeEntry').textContent = formatTime(parkingEntryTime);
  ambil('timeEntryDate').textContent = formatDate(parkingEntryTime) + ' · ' + CAMPUS_TIME_LABEL;
  ambil('timeDuration').textContent = durationText;
  ambil('timelineEntry').textContent = formatDateTime(parkingEntryTime) + ' · Gerbang Timur';
  ambil('homeDuration').textContent = durationText;
  ambil('plateSummary').textContent = DEMO_LICENSE_PLATE;
  ambil('plateDetail').textContent = DEMO_LICENSE_PLATE;
  ambil('homeVehicleSummary').textContent = 'Honda Vario 160 · ' + DEMO_LICENSE_PLATE;
  ambil('homeSessionState').textContent = parkingExitTime ? 'Selesai' : 'Aktif';
  ambil('homeSessionState').classList.toggle('done', Boolean(parkingExitTime));
  if (parkingExitTime) {
    ambil('homeParkingStatus').textContent = `Motor sudah keluar pukul ${formatTime(parkingExitTime)}`;
    ambil('timeExit').textContent = formatTime(parkingExitTime);
    ambil('timeExitDate').textContent = `${formatDate(parkingExitTime)} · ${CAMPUS_TIME_LABEL}`;
    ambil('timelineExitTitle').textContent = 'Kendaraan keluar';
    ambil('timelineExit').textContent = `${formatDateTime(parkingExitTime)} · Gerbang Timur`;
    ambil('exitTimeline').classList.remove('pending');
    ambil('motorStatus').textContent = 'Sudah keluar';
    ambil('qrValidationState').textContent = '● QR SUDAH DIPAKAI';
    ambil('qrValidationState').classList.add('done');
    ambil('qrActive').classList.add('hidden');
    ambil('qrInactive').classList.remove('hidden');
    ambil('validateBtn').disabled = true;
    ambil('validateBtn').textContent = 'QR sudah digunakan';
    ambil('exitDone').classList.remove('hidden');
  } else {
    ambil('homeParkingStatus').textContent = 'Motor kamu terparkir di C-024';
    ambil('timeExit').textContent = 'Belum';
    ambil('timeExitDate').textContent = 'Akan tercatat saat QR divalidasi';
    ambil('timelineExitTitle').textContent = 'Motor masih terparkir';
    ambil('timelineExit').textContent = 'Waktu keluar akan tercatat setelah QR divalidasi di gerbang.';
    ambil('exitTimeline').classList.add('pending');
    ambil('motorStatus').textContent = 'Masih terparkir';
    ambil('qrValidationState').textContent = '● QR MASIH AKTIF';
    ambil('qrValidationState').classList.remove('done');
    ambil('qrActive').classList.remove('hidden');
    ambil('qrInactive').classList.add('hidden');
    ambil('validateBtn').disabled = false;
    ambil('validateBtn').textContent = 'Simulasikan validasi keluar';
    ambil('exitDone').classList.add('hidden');
  }
}
function startDurationTimer() {
  stopDurationTimer();
  updateParkingSessionUI();
  if (!document.hidden && !parkingExitTime) durationInterval = setInterval(updateParkingSessionUI, 15000);
}
function stopDurationTimer() {
  if (durationInterval !== null) clearInterval(durationInterval);
  durationInterval = null;
}
function focusAndScrollTo(element) {
  if (!element) return;
  element.focus({ preventScroll: true });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.scrollTo({
    top: 0,
    behavior: reduceMotion ? 'auto' : 'smooth'
  });
}
// Tampilkan satu halaman fitur dan tandai tab yang sedang dipilih.
function showFeaturePage(name, moveFocus = true) {
  if (!featureConfig[name]) return;
  ambil('appScreen').classList.add('detail-active');
  ambil('campusHomeView').classList.add('hidden');
  ambil('featureDetailView').classList.remove('hidden');
  ambil('featurePageTitle').textContent = featureConfig[name].title;
  ambil('featurePageSubtitle').textContent = featureConfig[name].subtitle;
  document.querySelectorAll('.feature-section').forEach(section => section.classList.add('hidden'));
  ambil('feature-' + name).classList.remove('hidden');
  document.querySelectorAll('[data-open-feature]').forEach(button => {
    const selected = button.dataset.openFeature === name;
    button.setAttribute('aria-pressed', String(selected));
  });
  updateParkingSessionUI();
  if (moveFocus) focusAndScrollTo(ambil('featurePageTitle'));
}
function showHomePage(moveFocus = true) {
  ambil('appScreen').classList.remove('detail-active');
  ambil('featureDetailView').classList.add('hidden');
  ambil('campusHomeView').classList.remove('hidden');
  updateParkingSessionUI();
  if (moveFocus) focusAndScrollTo(ambil('homeTitle'));
}
// Mengatur alamat halaman saat menu dibuka.
function navigateToFeature(name) {
  if (!featureConfig[name]) return;
  const fromHome = !location.hash || !featureConfig[location.hash.slice(1)];
  const newUrl = `${location.pathname}${location.search}#${name}`;
  if (fromHome) safeHistoryPush({ parkirView: name }, newUrl, name);
  else safeHistoryReplace({ parkirView: name }, newUrl);
  showFeaturePage(name, true);
}
function navigateToHome() {
  if (history.state && featureConfig[history.state.parkirView]) {
    history.back();
    return;
  }
  if (location.hash) safeHistoryReplace({ parkirView: 'home' }, location.pathname + location.search);
  showHomePage(true);
}
function restoreViewFromUrl() {
  const route = location.hash.slice(1);
  if (featureConfig[route]) showFeaturePage(route, true);
  else showHomePage(true);
}
window.addEventListener('popstate', restoreViewFromUrl);
window.addEventListener('hashchange', restoreViewFromUrl);
// Tautan bantuan dapat diisi melalui pengaturan HELPDESK_URL di bagian atas.
function openCampusHelpdesk() {
  if (HELPDESK_URL.trim()) {
    window.open(HELPDESK_URL, '_blank', 'noopener,noreferrer');
  } else {
    showToast('Kontak helpdesk belum diatur pada demo ini. Hubungi petugas kampus melalui kanal resmi.');
  }
}
// Mengatur tampilan kotak dialog.
function openAccessibleDialog(dialogId, initialFocusId) {
  if (currentDialogId) return;
  lastFocusedElement = document.activeElement;
  currentDialogId = dialogId;
  originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  ambil('appScreen').inert = true;
  ambil(dialogId).classList.remove('hidden');
  const target = initialFocusId ? ambil(initialFocusId) : ambil(dialogId).querySelector('button');
  if (target) target.focus();
}
function closeAccessibleDialog(dialogId, restoreFocus = true) {
  if (currentDialogId !== dialogId) return;
  ambil(dialogId).classList.add('hidden');
  ambil('appScreen').inert = false;
  document.body.style.overflow = originalBodyOverflow;
  currentDialogId = null;
  const target = lastFocusedElement;
  lastFocusedElement = null;
  if (restoreFocus && target && target.isConnected && !target.closest('.hidden')) target.focus();
}
function openQrDialog() {
  if (parkingExitTime) {
    showToast('QR sudah tidak berlaku karena sesi parkir selesai.');
    return;
  }
  openAccessibleDialog('qrModal', 'closeModalBtn');
}
function closeQrDialog(restoreFocus = true) {
  closeAccessibleDialog('qrModal', restoreFocus);
}
function openLogoutConfirmation() {
  openAccessibleDialog('logoutModal', 'cancelLogoutBtn');
}
function closeLogoutConfirmation(restoreFocus = true) {
  closeAccessibleDialog('logoutModal', restoreFocus);
}
function keepFocusInsideDialog(event, dialogId) {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (dialogId === 'qrModal') closeQrDialog();
    else closeLogoutConfirmation();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusableSelector = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');
  const focusable = [...ambil(dialogId).querySelectorAll(focusableSelector)];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
// Simulasi saat QR divalidasi.
function simulateExitValidation() {
  if (parkingExitTime) {
    showToast('QR ini sudah pernah digunakan.');
    return;
  }
  parkingExitTime = new Date();
  stopDurationTimer();
  updateParkingSessionUI();
  saveDemoSessionState();
  closeQrDialog(false);
  focusAndScrollTo(ambil('qrValidationState'));
  showToast('Berhasil! Waktu keluar sudah tercatat di versi demo.');
}
// Membuat sesi parkir baru untuk mencoba demo lagi.
function startNewDemoParkingSession() {
  parkingEntryTime = new Date();
  parkingExitTime = null;
  ticketSequence += 1;
  currentTicketCode = createTicketCode(parkingEntryTime, ticketSequence);
  renderTicketQr();
  startDurationTimer();
  saveDemoSessionState();
  focusAndScrollTo(ambil('qrValidationState'));
  showToast('Sesi parkir baru sudah dimulai.');
}

/*
 * EVENT DAN NAVIGASI
 * Bagian ini menghubungkan tombol pada halaman dengan fungsi aplikasi.
 */
document.querySelectorAll('.app-feature-card').forEach(card => {
  card.addEventListener('click', () => navigateToFeature(card.dataset.feature));
});

document.querySelectorAll('[data-open-feature]').forEach(button => {
  button.addEventListener('click', () => navigateToFeature(button.dataset.openFeature));
});
ambil('backToAppsBtn').addEventListener('click', navigateToHome);

/*
 * LOGIN DEMO
 * Kedua kolom wajib diisi untuk mencoba alur masuk.
 * Kredensial tidak dikirim ke server dan password langsung dikosongkan.
 * Untuk penggunaan nyata, arahkan proses ini ke SSO resmi kampus (OAuth/OIDC atau SAML).
 */
ambil('loginForm').addEventListener('submit', event => {
  event.preventDefault();
  const account = ambil('sso').value.trim();
  const password = ambil('ssoPassword').value;
  if (!account) {
    ambil('loginError').textContent = 'Masukkan akun SSO kampus terlebih dahulu.';
    ambil('sso').focus();
    return;
  }
  if (!password) {
    ambil('loginError').textContent = 'Masukkan password untuk melanjutkan.';
    ambil('ssoPassword').focus();
    return;
  }
  ambil('loginError').textContent = '';
  ambil('ssoPassword').value = ''; // Jangan menyimpan password demo di memori sesi aplikasi.
  ambil('toggleSsoPassword').textContent = 'Lihat';
  ambil('toggleSsoPassword').setAttribute('aria-label', 'Tampilkan password');
  ambil('toggleSsoPassword').setAttribute('aria-pressed', 'false');
  ambil('ssoPassword').type = 'password';
  updateStudentProfile(account);
  ambil('loginScreen').classList.add('hidden');
  ambil('appScreen').classList.remove('hidden');
  navigateToHome();
  startDurationTimer();
  saveDemoSessionState();
  if (requestedInitialFeature) navigateToFeature(requestedInitialFeature);
});
ambil('toggleSsoPassword').addEventListener('click', () => {
  const passwordInput = ambil('ssoPassword');
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  ambil('toggleSsoPassword').textContent = showing ? 'Lihat' : 'Sembunyikan';
  ambil('toggleSsoPassword').setAttribute('aria-label', showing ? 'Tampilkan password' : 'Sembunyikan password');
  ambil('toggleSsoPassword').setAttribute('aria-pressed', String(!showing));
});
ambil('rememberDevice').addEventListener('change', saveDemoSessionState);
ambil('forgotBtn').addEventListener('click', openCampusHelpdesk);
ambil('loginHelpBtn').addEventListener('click', openCampusHelpdesk);
ambil('homeHelpBtn').addEventListener('click', openCampusHelpdesk);
function logOutStudent() {
  closeLogoutConfirmation(false);
  stopDurationTimer();
  try {
    sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
  } catch (error) {
    // Tidak masalah jika browser membatasi akses penyimpanan.
  }
  signedInSsoAccount = '';
  ambil('rememberDevice').checked = false;
  ambil('appScreen').classList.add('hidden');
  ambil('appScreen').classList.remove('detail-active');
  ambil('loginScreen').classList.remove('hidden');
  ambil('sso').value = '';
  ambil('ssoPassword').value = '';
  ambil('ssoPassword').type = 'password';
  ambil('toggleSsoPassword').textContent = 'Lihat';
  ambil('toggleSsoPassword').setAttribute('aria-label', 'Tampilkan password');
  ambil('toggleSsoPassword').setAttribute('aria-pressed', 'false');
  ambil('loginError').textContent = '';
  parkingEntryTime = new Date(Date.now() - 86 * 60000);
  parkingExitTime = null;
  ticketSequence += 1;
  currentTicketCode = createTicketCode(parkingEntryTime, ticketSequence);
  renderTicketQr();
  updateParkingSessionUI();
  safeHistoryReplace({ parkirView: 'home' }, location.pathname + location.search);
  ambil('sso').focus();
  showToast('Kamu sudah keluar dari akun demo.');
}
ambil('logoutBtn').addEventListener('click', openLogoutConfirmation);
ambil('cancelLogoutBtn').addEventListener('click', () => closeLogoutConfirmation());
ambil('confirmLogoutBtn').addEventListener('click', logOutStudent);

// Tombol dan dialog QR: mendukung Escape serta menjaga fokus keyboard tetap terarah.
ambil('enlargeQrBtn').addEventListener('click', openQrDialog);
ambil('closeModalBtn').addEventListener('click', () => closeQrDialog());
ambil('qrModal').addEventListener('click', event => {
  if (event.target === ambil('qrModal')) closeQrDialog();
});
ambil('qrModal').addEventListener('keydown', event => keepFocusInsideDialog(event, 'qrModal'));
ambil('logoutModal').addEventListener('click', event => {
  if (event.target === ambil('logoutModal')) closeLogoutConfirmation();
});
ambil('logoutModal').addEventListener('keydown', event => keepFocusInsideDialog(event, 'logoutModal'));
ambil('copyQrBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentTicketCode);
    showToast('Kode tiket sudah disalin.');
  } catch (error) {
    showToast('Kode tiket: ' + currentTicketCode);
  }
});
ambil('validateBtn').addEventListener('click', simulateExitValidation);
ambil('modalValidateBtn').addEventListener('click', simulateExitValidation);
ambil('resetDemoBtn').addEventListener('click', startNewDemoParkingSession);

// Hentikan timer saat tab tidak terlihat agar browser tidak bekerja tanpa perlu.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopDurationTimer();
  } else if (ambil('appScreen') && !ambil('appScreen').classList.contains('hidden') && !parkingExitTime) {
    startDurationTimer();
  }
});

renderTicketQr();
updateParkingSessionUI();
const restoredSession = restoreDemoSessionState();
if (restoredSession && requestedInitialFeature) navigateToFeature(requestedInitialFeature);

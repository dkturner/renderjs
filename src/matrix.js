/* Matrix stack designed for WebGL use.
 *
 * WebGL matrices are stored in column-major format, and so therefore ours are too.  This caught me out the first
 * time.  By convention most of the operations here are *right* multiplications, i.e. matrix.translate(x,y,z)
 * is equivalent to M_1 x M_t, where M_1 is the current matrix and M_t is the translation matrix.  The reason for
 * this is that scene rendering progresses from outside to inside, i.e. the most recent operation is also the
 * "most local" - a translate followed by a scale means "first size the object and then move it".  Given that
 * the transformation to clip space is P x C x M x v (P = perspective, C = camera, M = model, v = point), the first
 * operations to be applied are the ones on the right.
 *
 * The matrices are stored as 32-bit floats, and so the byte-indices are as follows:
 *
 *  /  0  16  32  48  \
 *  |  4  20  36  52  |
 *  |  8  24  40  56  |
 *  \ 12  28  44  60  /
 */
'use strict';

var MatrixStack = (function () {
    function Asm(stdlib, foreign, heap) {
        'use asm';

        var data = new stdlib.Float32Array(heap);

        var imul = stdlib.Math.imul;
        var fround = stdlib.Math.fround;
        var floor = stdlib.Math.floor;
        var sin = stdlib.Math.sin;
        var cos = stdlib.Math.cos;
        var tan = stdlib.Math.tan;
        var sqrt = stdlib.Math.sqrt;

        function identity(index) {
            index = index|0;
            index = index<<6;
            data[(index+ 0)>>2] = fround(1.0);
            data[(index+ 4)>>2] = fround(0.0);
            data[(index+ 8)>>2] = fround(0.0);
            data[(index+12)>>2] = fround(0.0);
            data[(index+16)>>2] = fround(0.0);
            data[(index+20)>>2] = fround(1.0);
            data[(index+24)>>2] = fround(0.0);
            data[(index+28)>>2] = fround(0.0);
            data[(index+32)>>2] = fround(0.0);
            data[(index+36)>>2] = fround(0.0);
            data[(index+40)>>2] = fround(1.0);
            data[(index+44)>>2] = fround(0.0);
            data[(index+48)>>2] = fround(0.0);
            data[(index+52)>>2] = fround(0.0);
            data[(index+56)>>2] = fround(0.0);
            data[(index+60)>>2] = fround(1.0);
        }

        function perspective(index, fov, ar, near, far) {
            index = index|0;
            fov = +fov;
            ar = +ar;
            near = +near;
            far = +far;
            var f = 0.0;
            var rangeInv = 0.0;
            index = index<<6;
            f = 1.0 / tan(fov / 2.0);
            rangeInv = 1.0 / (near - far);
            // col 1
            data[(index+ 0)>>2] = fround(f / ar);
            data[(index+ 4)>>2] = fround(0.0);
            data[(index+ 8)>>2] = fround(0.0);
            data[(index+12)>>2] = fround(0.0);
            // col 2
            data[(index+16)>>2] = fround(0.0);
            data[(index+20)>>2] = fround(f);
            data[(index+24)>>2] = fround(0.0);
            data[(index+28)>>2] = fround(0.0);
            // col 3
            data[(index+32)>>2] = fround(0.0);
            data[(index+36)>>2] = fround(0.0);
            data[(index+40)>>2] = fround((near + far) * rangeInv);
            data[(index+44)>>2] = fround(-1.0);
            // col 4
            data[(index+48)>>2] = fround(0.0);
            data[(index+52)>>2] = fround(0.0);
            data[(index+56)>>2] = fround(near * far * rangeInv * 2.0);
            data[(index+60)>>2] = fround(0.0);
        }

        function rmul(dst, src) {
            dst = dst|0;
            src = src|0;
            var m11=fround(0.0),m12=fround(0.0),m13=fround(0.0),m14=fround(0.0),
                m21=fround(0.0),m22=fround(0.0),m23=fround(0.0),m24=fround(0.0),
                m31=fround(0.0),m32=fround(0.0),m33=fround(0.0),m34=fround(0.0),
                m41=fround(0.0),m42=fround(0.0),m43=fround(0.0),m44=fround(0.0);
            dst = dst<<6;
            src = src<<6;
            // col 1
            m11 = fround(fround(
                  fround(fround(data[(src+ 0)>>2]) * fround(data[(dst+ 0)>>2]))
                + fround(fround(data[(src+ 4)>>2]) * fround(data[(dst+16)>>2]))) + fround(
                  fround(fround(data[(src+ 8)>>2]) * fround(data[(dst+32)>>2]))
                + fround(fround(data[(src+12)>>2]) * fround(data[(dst+48)>>2]))));
            m12 = fround(fround(
                  fround(fround(data[(src+ 0)>>2]) * fround(data[(dst+ 4)>>2]))
                + fround(fround(data[(src+ 4)>>2]) * fround(data[(dst+20)>>2]))) + fround(
                  fround(fround(data[(src+ 8)>>2]) * fround(data[(dst+36)>>2]))
                + fround(fround(data[(src+12)>>2]) * fround(data[(dst+52)>>2]))));
            m13 = fround(fround(
                  fround(fround(data[(src+ 0)>>2]) * fround(data[(dst+ 8)>>2]))
                + fround(fround(data[(src+ 4)>>2]) * fround(data[(dst+24)>>2]))) + fround(
                  fround(fround(data[(src+ 8)>>2]) * fround(data[(dst+40)>>2]))
                + fround(fround(data[(src+12)>>2]) * fround(data[(dst+56)>>2]))));
            m14 = fround(fround(
                  fround(fround(data[(src+ 0)>>2]) * fround(data[(dst+12)>>2]))
                + fround(fround(data[(src+ 4)>>2]) * fround(data[(dst+28)>>2]))) + fround(
                  fround(fround(data[(src+ 8)>>2]) * fround(data[(dst+44)>>2]))
                + fround(fround(data[(src+12)>>2]) * fround(data[(dst+60)>>2]))));
            // col 2
            m21 = fround(fround(
                  fround(fround(data[(src+16)>>2]) * fround(data[(dst+ 0)>>2]))
                + fround(fround(data[(src+20)>>2]) * fround(data[(dst+16)>>2]))) + fround(
                  fround(fround(data[(src+24)>>2]) * fround(data[(dst+32)>>2]))
                + fround(fround(data[(src+28)>>2]) * fround(data[(dst+48)>>2]))));
            m22 = fround(fround(
                  fround(fround(data[(src+16)>>2]) * fround(data[(dst+ 4)>>2]))
                + fround(fround(data[(src+20)>>2]) * fround(data[(dst+20)>>2]))) + fround(
                  fround(fround(data[(src+24)>>2]) * fround(data[(dst+36)>>2]))
                + fround(fround(data[(src+28)>>2]) * fround(data[(dst+52)>>2]))));
            m23 = fround(fround(
                  fround(fround(data[(src+16)>>2]) * fround(data[(dst+ 8)>>2]))
                + fround(fround(data[(src+20)>>2]) * fround(data[(dst+24)>>2]))) + fround(
                  fround(fround(data[(src+24)>>2]) * fround(data[(dst+40)>>2]))
                + fround(fround(data[(src+28)>>2]) * fround(data[(dst+56)>>2]))));
            m24 = fround(fround(
                  fround(fround(data[(src+16)>>2]) * fround(data[(dst+12)>>2]))
                + fround(fround(data[(src+20)>>2]) * fround(data[(dst+28)>>2]))) + fround(
                  fround(fround(data[(src+24)>>2]) * fround(data[(dst+44)>>2]))
                + fround(fround(data[(src+28)>>2]) * fround(data[(dst+60)>>2]))));
            // col 3
            m31 = fround(fround(
                  fround(fround(data[(src+32)>>2]) * fround(data[(dst+ 0)>>2]))
                + fround(fround(data[(src+36)>>2]) * fround(data[(dst+16)>>2]))) + fround(
                  fround(fround(data[(src+40)>>2]) * fround(data[(dst+32)>>2]))
                + fround(fround(data[(src+44)>>2]) * fround(data[(dst+48)>>2]))));
            m32 = fround(fround(
                  fround(fround(data[(src+32)>>2]) * fround(data[(dst+ 4)>>2]))
                + fround(fround(data[(src+36)>>2]) * fround(data[(dst+20)>>2]))) + fround(
                  fround(fround(data[(src+40)>>2]) * fround(data[(dst+36)>>2]))
                + fround(fround(data[(src+44)>>2]) * fround(data[(dst+52)>>2]))));
            m33 = fround(fround(
                  fround(fround(data[(src+32)>>2]) * fround(data[(dst+ 8)>>2]))
                + fround(fround(data[(src+36)>>2]) * fround(data[(dst+24)>>2]))) + fround(
                  fround(fround(data[(src+40)>>2]) * fround(data[(dst+40)>>2]))
                + fround(fround(data[(src+44)>>2]) * fround(data[(dst+56)>>2]))));
            m34 = fround(fround(
                  fround(fround(data[(src+32)>>2]) * fround(data[(dst+12)>>2]))
                + fround(fround(data[(src+36)>>2]) * fround(data[(dst+28)>>2]))) + fround(
                  fround(fround(data[(src+40)>>2]) * fround(data[(dst+44)>>2]))
                + fround(fround(data[(src+44)>>2]) * fround(data[(dst+60)>>2]))));
            // col 4
            m41 = fround(fround(
                  fround(fround(data[(src+48)>>2]) * fround(data[(dst+ 0)>>2]))
                + fround(fround(data[(src+52)>>2]) * fround(data[(dst+16)>>2]))) + fround(
                  fround(fround(data[(src+56)>>2]) * fround(data[(dst+32)>>2]))
                + fround(fround(data[(src+60)>>2]) * fround(data[(dst+48)>>2]))));
            m42 = fround(fround(
                  fround(fround(data[(src+48)>>2]) * fround(data[(dst+ 4)>>2]))
                + fround(fround(data[(src+52)>>2]) * fround(data[(dst+20)>>2]))) + fround(
                  fround(fround(data[(src+56)>>2]) * fround(data[(dst+36)>>2]))
                + fround(fround(data[(src+60)>>2]) * fround(data[(dst+52)>>2]))));
            m43 = fround(fround(
                  fround(fround(data[(src+48)>>2]) * fround(data[(dst+ 8)>>2]))
                + fround(fround(data[(src+52)>>2]) * fround(data[(dst+24)>>2]))) + fround(
                  fround(fround(data[(src+56)>>2]) * fround(data[(dst+40)>>2]))
                + fround(fround(data[(src+60)>>2]) * fround(data[(dst+56)>>2]))));
            m44 = fround(fround(
                  fround(fround(data[(src+48)>>2]) * fround(data[(dst+12)>>2]))
                + fround(fround(data[(src+52)>>2]) * fround(data[(dst+28)>>2]))) + fround(
                  fround(fround(data[(src+56)>>2]) * fround(data[(dst+44)>>2]))
                + fround(fround(data[(src+60)>>2]) * fround(data[(dst+60)>>2]))));
            data[(dst+ 0)>>2] = m11;
            data[(dst+ 4)>>2] = m12;
            data[(dst+ 8)>>2] = m13;
            data[(dst+12)>>2] = m14;
            data[(dst+16)>>2] = m21;
            data[(dst+20)>>2] = m22;
            data[(dst+24)>>2] = m23;
            data[(dst+28)>>2] = m24;
            data[(dst+32)>>2] = m31;
            data[(dst+36)>>2] = m32;
            data[(dst+40)>>2] = m33;
            data[(dst+44)>>2] = m34;
            data[(dst+48)>>2] = m41;
            data[(dst+52)>>2] = m42;
            data[(dst+56)>>2] = m43;
            data[(dst+60)>>2] = m44;
        }

        function lmul(dst, src) {
            dst = dst|0;
            src = src|0;
            var m11=fround(0.0),m12=fround(0.0),m13=fround(0.0),m14=fround(0.0),
                m21=fround(0.0),m22=fround(0.0),m23=fround(0.0),m24=fround(0.0),
                m31=fround(0.0),m32=fround(0.0),m33=fround(0.0),m34=fround(0.0),
                m41=fround(0.0),m42=fround(0.0),m43=fround(0.0),m44=fround(0.0);
            dst = dst<<6;
            src = src<<6;
            m11 = fround(fround(
                  fround(fround(data[(dst+ 0)>>2]) * fround(data[(src+ 0)>>2]))
                + fround(fround(data[(dst+ 4)>>2]) * fround(data[(src+16)>>2]))) + fround(
                  fround(fround(data[(dst+ 8)>>2]) * fround(data[(src+32)>>2]))
                + fround(fround(data[(dst+12)>>2]) * fround(data[(src+48)>>2]))));
            m12 = fround(fround(
                  fround(fround(data[(dst+ 0)>>2]) * fround(data[(src+ 4)>>2]))
                + fround(fround(data[(dst+ 4)>>2]) * fround(data[(src+20)>>2]))) + fround(
                  fround(fround(data[(dst+ 8)>>2]) * fround(data[(src+36)>>2]))
                + fround(fround(data[(dst+12)>>2]) * fround(data[(src+52)>>2]))));
            m13 = fround(fround(
                  fround(fround(data[(dst+ 0)>>2]) * fround(data[(src+ 8)>>2]))
                + fround(fround(data[(dst+ 4)>>2]) * fround(data[(src+24)>>2]))) + fround(
                  fround(fround(data[(dst+ 8)>>2]) * fround(data[(src+40)>>2]))
                + fround(fround(data[(dst+12)>>2]) * fround(data[(src+56)>>2]))));
            m14 = fround(fround(
                  fround(fround(data[(dst+ 0)>>2]) * fround(data[(src+12)>>2]))
                + fround(fround(data[(dst+ 4)>>2]) * fround(data[(src+28)>>2]))) + fround(
                  fround(fround(data[(dst+ 8)>>2]) * fround(data[(src+44)>>2]))
                + fround(fround(data[(dst+12)>>2]) * fround(data[(src+60)>>2]))));
            m21 = fround(fround(
                  fround(fround(data[(dst+16)>>2]) * fround(data[(src+ 0)>>2]))
                + fround(fround(data[(dst+20)>>2]) * fround(data[(src+16)>>2]))) + fround(
                  fround(fround(data[(dst+24)>>2]) * fround(data[(src+32)>>2]))
                + fround(fround(data[(dst+28)>>2]) * fround(data[(src+48)>>2]))));
            m22 = fround(fround(
                  fround(fround(data[(dst+16)>>2]) * fround(data[(src+ 4)>>2]))
                + fround(fround(data[(dst+20)>>2]) * fround(data[(src+20)>>2]))) + fround(
                  fround(fround(data[(dst+24)>>2]) * fround(data[(src+36)>>2]))
                + fround(fround(data[(dst+28)>>2]) * fround(data[(src+52)>>2]))));
            m23 = fround(fround(
                  fround(fround(data[(dst+16)>>2]) * fround(data[(src+ 8)>>2]))
                + fround(fround(data[(dst+20)>>2]) * fround(data[(src+24)>>2]))) + fround(
                  fround(fround(data[(dst+24)>>2]) * fround(data[(src+40)>>2]))
                + fround(fround(data[(dst+28)>>2]) * fround(data[(src+56)>>2]))));
            m24 = fround(fround(
                  fround(fround(data[(dst+16)>>2]) * fround(data[(src+12)>>2]))
                + fround(fround(data[(dst+20)>>2]) * fround(data[(src+28)>>2]))) + fround(
                  fround(fround(data[(dst+24)>>2]) * fround(data[(src+44)>>2]))
                + fround(fround(data[(dst+28)>>2]) * fround(data[(src+60)>>2]))));
            m31 = fround(fround(
                  fround(fround(data[(dst+32)>>2]) * fround(data[(src+ 0)>>2]))
                + fround(fround(data[(dst+36)>>2]) * fround(data[(src+16)>>2]))) + fround(
                  fround(fround(data[(dst+40)>>2]) * fround(data[(src+32)>>2]))
                + fround(fround(data[(dst+44)>>2]) * fround(data[(src+48)>>2]))));
            m32 = fround(fround(
                  fround(fround(data[(dst+32)>>2]) * fround(data[(src+ 4)>>2]))
                + fround(fround(data[(dst+36)>>2]) * fround(data[(src+20)>>2]))) + fround(
                  fround(fround(data[(dst+40)>>2]) * fround(data[(src+36)>>2]))
                + fround(fround(data[(dst+44)>>2]) * fround(data[(src+52)>>2]))));
            m33 = fround(fround(
                  fround(fround(data[(dst+32)>>2]) * fround(data[(src+ 8)>>2]))
                + fround(fround(data[(dst+36)>>2]) * fround(data[(src+24)>>2]))) + fround(
                  fround(fround(data[(dst+40)>>2]) * fround(data[(src+40)>>2]))
                + fround(fround(data[(dst+44)>>2]) * fround(data[(src+56)>>2]))));
            m34 = fround(fround(
                  fround(fround(data[(dst+32)>>2]) * fround(data[(src+12)>>2]))
                + fround(fround(data[(dst+36)>>2]) * fround(data[(src+28)>>2]))) + fround(
                  fround(fround(data[(dst+40)>>2]) * fround(data[(src+44)>>2]))
                + fround(fround(data[(dst+44)>>2]) * fround(data[(src+60)>>2]))));
            m41 = fround(fround(
                  fround(fround(data[(dst+48)>>2]) * fround(data[(src+ 0)>>2]))
                + fround(fround(data[(dst+52)>>2]) * fround(data[(src+16)>>2]))) + fround(
                  fround(fround(data[(dst+56)>>2]) * fround(data[(src+32)>>2]))
                + fround(fround(data[(dst+60)>>2]) * fround(data[(src+48)>>2]))));
            m42 = fround(fround(
                  fround(fround(data[(dst+48)>>2]) * fround(data[(src+ 4)>>2]))
                + fround(fround(data[(dst+52)>>2]) * fround(data[(src+20)>>2]))) + fround(
                  fround(fround(data[(dst+56)>>2]) * fround(data[(src+36)>>2]))
                + fround(fround(data[(dst+60)>>2]) * fround(data[(src+52)>>2]))));
            m43 = fround(fround(
                  fround(fround(data[(dst+48)>>2]) * fround(data[(src+ 8)>>2]))
                + fround(fround(data[(dst+52)>>2]) * fround(data[(src+24)>>2]))) + fround(
                  fround(fround(data[(dst+56)>>2]) * fround(data[(src+40)>>2]))
                + fround(fround(data[(dst+60)>>2]) * fround(data[(src+56)>>2]))));
            m44 = fround(fround(
                  fround(fround(data[(dst+48)>>2]) * fround(data[(src+12)>>2]))
                + fround(fround(data[(dst+52)>>2]) * fround(data[(src+28)>>2]))) + fround(
                  fround(fround(data[(dst+56)>>2]) * fround(data[(src+44)>>2]))
                + fround(fround(data[(dst+60)>>2]) * fround(data[(src+60)>>2]))));
            data[(dst+ 0)>>2] = m11;
            data[(dst+ 4)>>2] = m12;
            data[(dst+ 8)>>2] = m13;
            data[(dst+12)>>2] = m14;
            data[(dst+16)>>2] = m21;
            data[(dst+20)>>2] = m22;
            data[(dst+24)>>2] = m23;
            data[(dst+28)>>2] = m24;
            data[(dst+32)>>2] = m31;
            data[(dst+36)>>2] = m32;
            data[(dst+40)>>2] = m33;
            data[(dst+44)>>2] = m34;
            data[(dst+48)>>2] = m41;
            data[(dst+52)>>2] = m42;
            data[(dst+56)>>2] = m43;
            data[(dst+60)>>2] = m44;
        }

        function translate(index, x, y, z) {
            index = index|0;
            x = +x;
            y = +y;
            z = +z;
            var m41=0.0, m42=0.0, m43=0.0, m44=0.0;
            index = index<<6;
            m41 = x*+data[(index+ 0)>>2] + y*+data[(index+16)>>2] + z*+data[(index+32)>>2] + +data[(index+48)>>2];
            m42 = x*+data[(index+ 4)>>2] + y*+data[(index+20)>>2] + z*+data[(index+36)>>2] + +data[(index+52)>>2];
            m43 = x*+data[(index+ 8)>>2] + y*+data[(index+24)>>2] + z*+data[(index+40)>>2] + +data[(index+56)>>2];
            m44 = x*+data[(index+12)>>2] + y*+data[(index+28)>>2] + z*+data[(index+44)>>2] + +data[(index+60)>>2];
            data[(index+48)>>2] = fround(m41);
            data[(index+52)>>2] = fround(m42);
            data[(index+56)>>2] = fround(m43);
            data[(index+60)>>2] = fround(m44);
        }

        function scale(index, x, y, z) {
            index = index|0;
            x = +x;
            y = +y;
            z = +z;
            index = index<<6;
            // col 1
            data[(index+ 0)>>2] = fround(x*+data[(index+ 0)>>2]);
            data[(index+ 4)>>2] = fround(x*+data[(index+ 4)>>2]);
            data[(index+ 8)>>2] = fround(x*+data[(index+ 8)>>2]);
            data[(index+12)>>2] = fround(x*+data[(index+12)>>2]);
            // col 2
            data[(index+16)>>2] = fround(y*+data[(index+16)>>2]);
            data[(index+20)>>2] = fround(y*+data[(index+20)>>2]);
            data[(index+24)>>2] = fround(y*+data[(index+24)>>2]);
            data[(index+28)>>2] = fround(y*+data[(index+28)>>2]);
            // col 3
            data[(index+32)>>2] = fround(z*+data[(index+32)>>2]);
            data[(index+36)>>2] = fround(z*+data[(index+36)>>2]);
            data[(index+40)>>2] = fround(z*+data[(index+40)>>2]);
            data[(index+44)>>2] = fround(z*+data[(index+44)>>2]);
        }

        function rotation(dst, theta, x, y, z) {
            dst = dst|0;
            theta = +theta;
            x = +x;
            y = +y;
            z = +z;
            var length = 0.0, x2=0.0, y2=0.0, z2=0.0, cos_t=0.0, sin_t=0.0, comp_t=0.0;
            dst = dst << 6;
            x2 = x*x; y2 = y*y; z2 = z*z;
            length = sqrt(x2 + y2 + z2);
            cos_t = cos(theta);
            sin_t = sin(theta);
            comp_t = 1.0 - cos_t;
            x = x / length;
            y = y / length;
            z = z / length;
            // col 1
            data[(dst+ 0)>>2] = fround(cos_t + x2*comp_t);
            data[(dst+ 4)>>2] = fround(x*y*comp_t + z*sin_t);
            data[(dst+ 8)>>2] = fround(x*z*comp_t - y*sin_t);
            data[(dst+12)>>2] = fround(0.0);
            // col 2
            data[(dst+16)>>2] = fround(x*y*comp_t - z*sin_t);
            data[(dst+20)>>2] = fround(cos_t + y2*comp_t);
            data[(dst+24)>>2] = fround(y*z*comp_t + x*sin_t);
            data[(dst+28)>>2] = fround(0.0);
            // col 3
            data[(dst+32)>>2] = fround(x*z*comp_t + y*sin_t);
            data[(dst+36)>>2] = fround(y*z*comp_t - x*sin_t);
            data[(dst+40)>>2] = fround(cos_t + z2*comp_t);
            data[(dst+44)>>2] = fround(0.0);
            // col 4
            data[(dst+48)>>2] = fround(0.0);
            data[(dst+52)>>2] = fround(0.0);
            data[(dst+56)>>2] = fround(0.0);
            data[(dst+60)>>2] = fround(1.0);
        }

        function copy(dst, src) {
            dst = dst|0;
            src = src|0;
            var i = 0;
            dst = dst<<6;
            src = src<<6;
            for (; (i|0) < 64; i = ((i|0)+4)|0)
                data[(dst+i)>>2] = fround(data[(src+i)>>2]);
        }

        function invert(dst, src) {
            dst = dst|0;
            src = src|0;
            var invdet = 0.0, det = 0.0;
            var s0 = 0.0, s1 = 0.0, s2 = 0.0, s3 = 0.0, s4 = 0.0, s5 = 0.0;
            var c0 = 0.0, c1 = 0.0, c2 = 0.0, c3 = 0.0, c4 = 0.0, c5 = 0.0;
            dst = dst<<6;
            src = src<<6;

            if (+data[(src+12)>>2] == 0.0) if (+data[(src+28)>>2] == 0.0) if (+data[(src+44)>>2] == 0.0) {
                // Efficient special case for affine matrices, which is what we generally deal with.
                //         A = [ M  b ]
                //             [ 0  1 ]
                //    inv(A) = [ inv(M)  -inv(M)b ]
                //             [   0        1     ]
                s0 = +data[(src+20)>>2]*+data[(src+40)>>2] - +data[(src+36)>>2]*+data[(src+24)>>2];
                s1 = +data[(src+36)>>2]*+data[(src+ 8)>>2] - +data[(src+ 4)>>2]*+data[(src+40)>>2];
                s2 = +data[(src+ 4)>>2]*+data[(src+24)>>2] - +data[(src+20)>>2]*+data[(src+ 8)>>2];
                det = s0*+data[(src+ 0)>>2] + s1*+data[(src+16)>>2] + s2*+data[(src+32)>>2];
                invdet = +1 / det;
                // 3x3 col 1
                data[(dst+ 0)>>2] = fround(s0 * invdet);
                data[(dst+ 4)>>2] = fround(s1 * invdet);
                data[(dst+ 8)>>2] = fround(s2 * invdet);
                // 3x3 col 2
                data[(dst+16)>>2] = fround((+data[(src+32)>>2]*+data[(src+24)>>2] - +data[(src+16)>>2]*+data[(src+40)>>2]) * invdet);
                data[(dst+20)>>2] = fround((+data[(src+ 0)>>2]*+data[(src+40)>>2] - +data[(src+32)>>2]*+data[(src+ 8)>>2]) * invdet);
                data[(dst+24)>>2] = fround((+data[(src+16)>>2]*+data[(src+ 8)>>2] - +data[(src+ 0)>>2]*+data[(src+24)>>2]) * invdet);
                // 3x3 col 3
                data[(dst+32)>>2] = fround((+data[(src+16)>>2]*+data[(src+36)>>2] - +data[(src+32)>>2]*+data[(src+20)>>2]) * invdet);
                data[(dst+36)>>2] = fround((+data[(src+32)>>2]*+data[(src+ 4)>>2] - +data[(src+ 0)>>2]*+data[(src+36)>>2]) * invdet);
                data[(dst+40)>>2] = fround((+data[(src+ 0)>>2]*+data[(src+20)>>2] - +data[(src+16)>>2]*+data[(src+ 4)>>2]) * invdet);
                // the translation component, -inv(M) * b
                data[(dst+48)>>2] = fround(-(+data[(dst+ 0)>>2]*+data[(src+48)>>2] + +data[(dst+16)>>2]*+data[(src+52)>>2] + +data[(dst+32)>>2]*+data[(src+56)>>2]));
                data[(dst+52)>>2] = fround(-(+data[(dst+ 4)>>2]*+data[(src+48)>>2] + +data[(dst+20)>>2]*+data[(src+52)>>2] + +data[(dst+36)>>2]*+data[(src+56)>>2]));
                data[(dst+56)>>2] = fround(-(+data[(dst+ 8)>>2]*+data[(src+48)>>2] + +data[(dst+24)>>2]*+data[(src+52)>>2] + +data[(dst+40)>>2]*+data[(src+56)>>2]));
                // the bottom row
                data[(dst+12)>>2] = fround(0.0);
                data[(dst+28)>>2] = fround(0.0);
                data[(dst+44)>>2] = fround(0.0);
                data[(dst+60)>>2] = fround(1.0);
                return;
            }
            s0 = +data[(src+ 0)>>2]*+data[(src+20)>>2] - +data[(src+ 4)>>2]*+data[(src+16)>>2];
            s1 = +data[(src+ 0)>>2]*+data[(src+36)>>2] - +data[(src+ 4)>>2]*+data[(src+32)>>2];
            s2 = +data[(src+ 0)>>2]*+data[(src+52)>>2] - +data[(src+ 4)>>2]*+data[(src+48)>>2];
            s3 = +data[(src+16)>>2]*+data[(src+36)>>2] - +data[(src+20)>>2]*+data[(src+32)>>2];
            s4 = +data[(src+16)>>2]*+data[(src+52)>>2] - +data[(src+20)>>2]*+data[(src+48)>>2];
            s5 = +data[(src+32)>>2]*+data[(src+52)>>2] - +data[(src+36)>>2]*+data[(src+48)>>2];
            c5 = +data[(src+40)>>2]*+data[(src+60)>>2] - +data[(src+44)>>2]*+data[(src+56)>>2];
            c4 = +data[(src+24)>>2]*+data[(src+60)>>2] - +data[(src+28)>>2]*+data[(src+56)>>2];
            c3 = +data[(src+24)>>2]*+data[(src+44)>>2] - +data[(src+28)>>2]*+data[(src+40)>>2];
            c2 = +data[(src+ 8)>>2]*+data[(src+60)>>2] - +data[(src+12)>>2]*+data[(src+56)>>2];
            c1 = +data[(src+ 8)>>2]*+data[(src+44)>>2] - +data[(src+12)>>2]*+data[(src+40)>>2];
            c0 = +data[(src+ 8)>>2]*+data[(src+28)>>2] - +data[(src+12)>>2]*+data[(src+24)>>2];
            det = s0*c5 - s1*c4 + s2*c3 + s3*c2 - s4*c1 + s5*c0;
            invdet = +1/det;
            data[(dst+ 0)>>2] = ( +data[(src+20)>>2]*c5 - +data[(src+36)>>2]*c4 + +data[(src+52)>>2]*c3) * invdet;
            data[(dst+16)>>2] = (-+data[(src+16)>>2]*c5 + +data[(src+32)>>2]*c4 - +data[(src+48)>>2]*c3) * invdet;
            data[(dst+32)>>2] = ( +data[(src+28)>>2]*s5 - +data[(src+44)>>2]*s4 + +data[(src+60)>>2]*s3) * invdet;
            data[(dst+48)>>2] = (-+data[(src+24)>>2]*s5 + +data[(src+40)>>2]*s4 - +data[(src+56)>>2]*s3) * invdet;
            data[(dst+ 4)>>2] = (-+data[(src+ 4)>>2]*c5 + +data[(src+36)>>2]*c2 - +data[(src+52)>>2]*c1) * invdet;
            data[(dst+20)>>2] = ( +data[(src+ 0)>>2]*c5 - +data[(src+32)>>2]*c2 + +data[(src+48)>>2]*c1) * invdet;
            data[(dst+36)>>2] = (-+data[(src+12)>>2]*s5 + +data[(src+44)>>2]*s2 - +data[(src+60)>>2]*s1) * invdet;
            data[(dst+52)>>2] = ( +data[(src+ 8)>>2]*s5 - +data[(src+40)>>2]*s2 + +data[(src+56)>>2]*s1) * invdet;
            data[(dst+ 8)>>2] = ( +data[(src+ 4)>>2]*c4 - +data[(src+20)>>2]*c2 + +data[(src+52)>>2]*c0) * invdet;
            data[(dst+24)>>2] = (-+data[(src+ 0)>>2]*c4 + +data[(src+16)>>2]*c2 - +data[(src+48)>>2]*c0) * invdet;
            data[(dst+40)>>2] = ( +data[(src+12)>>2]*s4 - +data[(src+28)>>2]*s2 + +data[(src+60)>>2]*s0) * invdet;
            data[(dst+56)>>2] = (-+data[(src+ 8)>>2]*s4 + +data[(src+24)>>2]*s2 - +data[(src+56)>>2]*s0) * invdet;
            data[(dst+12)>>2] = (-+data[(src+ 4)>>2]*c3 + +data[(src+20)>>2]*c1 - +data[(src+36)>>2]*c0) * invdet;
            data[(dst+28)>>2] = ( +data[(src+ 0)>>2]*c3 - +data[(src+16)>>2]*c1 + +data[(src+32)>>2]*c0) * invdet;
            data[(dst+44)>>2] = (-+data[(src+12)>>2]*s3 + +data[(src+28)>>2]*s1 - +data[(src+44)>>2]*s0) * invdet;
            data[(dst+60)>>2] = ( +data[(src+ 8)>>2]*s3 - +data[(src+24)>>2]*s1 + +data[(src+40)>>2]*s0) * invdet;
        }

        function transform(index, x, y, z) {
            index = index|0;
            x = +x;
            y = +y;
            z = +z;
            var x_=0.0, y_=0.0, z_=0.0, u_=0.0;
            index = index<<6;
            x_ = x*+data[(index+ 0)>>2] + y*+data[(index+16)>>2] + z*+data[(index+32)>>2] + +data[(index+48)>>2];
            y_ = x*+data[(index+ 4)>>2] + y*+data[(index+20)>>2] + z*+data[(index+36)>>2] + +data[(index+52)>>2];
            z_ = x*+data[(index+ 8)>>2] + y*+data[(index+24)>>2] + z*+data[(index+40)>>2] + +data[(index+56)>>2];
            u_ = x*+data[(index+12)>>2] + y*+data[(index+28)>>2] + z*+data[(index+44)>>2] + +data[(index+60)>>2];
            data[( 0)>>2] = fround(x_ / u_);
            data[( 4)>>2] = fround(y_ / u_);
            data[( 8)>>2] = fround(z_ / u_);
        }

        return {
            identity: identity,
            perspective: perspective,
            rotation: rotation,

            translate: translate,
            scale: scale,

            lmul: lmul,
            rmul: rmul,
            copy: copy,
            invert: invert,
            transform: transform
        }
    }

    function MatrixStack() {
        var heapSize = 65536;
        var heap = new ArrayBuffer(heapSize);
        var data = new Float32Array(heap, 0, heapSize>>4);
        var asm = new Asm(window, null, heap);
        var count = 1;
        asm.identity(1);

        this.identity = function () {
            asm.identity(count);
        }
        this.perspective = function(fieldOfView, aspectRatio, near, far) {
            asm.perspective(count, 2*Math.PI*fieldOfView/360.0, aspectRatio, near, far);
        }
        this.translate = function(x, y, z) {
            asm.translate(count, x, y, z);
        }
        this.scale = function(x, y, z) {
            asm.scale(count, x, y, z);
        }
        this.rotate = function(deg, vector) {
            asm.rotation(0, 2*Math.PI*deg/360.0, vector[0], vector[1], vector[2]);
            asm.rmul(count, 0);
        }
        this.push = function () {
            if ((count + 1) == (heapSize >> 6))
                throw {error: 'too many matrices on stack'};
            asm.copy(count + 1, count);
            count++;
        }
        this.pop = function () {
            if (count < 2)
                throw {error:'nothing to pop'};
            count--;
        }
        this.mul = function () {
            if (count < 2)
                throw {error:'too few matrices on stack to multiply'};
            asm.rmul(count - 1, count);
            count--;
        }
        this.det = function () {
            var i = count<<4;
            var det1 = data[i+ 5]*data[i+10] - data[i+ 9]*data[i+ 6];
            var det2 = data[i+ 1]*data[i+10] - data[i+ 2]*data[i+ 9];
            var det3 = data[i+ 1]*data[i+ 6] - data[i+ 5]*data[i+ 2];
            return det1*data[i+0] - det2*data[i+4] + det3*data[i+8];
        }
        this.transform = function (x, y, z) {
            if (y == undefined && z == undefined)
                asm.transform(count, x[0], x[1], x[2]);
            else
                asm.transform(count, x, y, z);
            return [data[0], data[1], data[2]];
        }
        this.invert = function () {
            asm.invert(0, count);
            asm.copy(count, 0);
        }
        this.loadRowMajor = function (m) {
            // Note that we load in ROW-MAJOR format, which is the more intuitive format for matrices described
            // in code or textual data.
            var i = count << 4;
            if (m instanceof MatrixStack)
                m = m.getRowMajor();
            if (typeof m[0] == 'undefined')
                m = arguments;
            if (typeof m[0][0] != 'undefined') {
                data[i+ 0] = m[0][0]; data[i+ 4] = m[0][1]; data[i+ 8] = m[0][2]; data[i+12] = m[0][3];
                data[i+ 1] = m[1][0]; data[i+ 5] = m[1][1]; data[i+ 9] = m[1][2]; data[i+13] = m[1][3];
                data[i+ 2] = m[2][0]; data[i+ 6] = m[2][1]; data[i+10] = m[2][2]; data[i+14] = m[2][3];
                data[i+ 3] = m[3][0]; data[i+ 7] = m[3][1]; data[i+11] = m[3][2]; data[i+15] = m[3][3];
            } else {
                data[i+ 0] = m[ 0];   data[i+ 4] = m[ 1];   data[i+ 8] = m[ 2];   data[i+12] = m[ 3];
                data[i+ 1] = m[ 4];   data[i+ 5] = m[ 5];   data[i+ 9] = m[ 6];   data[i+13] = m[ 7];
                data[i+ 2] = m[ 8];   data[i+ 6] = m[ 9];   data[i+10] = m[10];   data[i+14] = m[11];
                data[i+ 3] = m[12];   data[i+ 7] = m[13];   data[i+11] = m[14];   data[i+15] = m[15];
            }
        }
        this.load = this.loadColMajor = function (m) {
            var i = count << 4;
            if (m instanceof MatrixStack)
                m = m.getData();
            if (typeof m[0] == 'undefined')
                m = arguments;
            if (typeof m[0][0] != 'undefined') {
                data[i+ 0] = m[0][0]; data[i+ 4] = m[1][0]; data[i+ 8] = m[2][0]; data[i+12] = m[3][0];
                data[i+ 1] = m[0][1]; data[i+ 5] = m[1][1]; data[i+ 9] = m[2][1]; data[i+13] = m[3][1];
                data[i+ 2] = m[0][2]; data[i+ 6] = m[1][2]; data[i+10] = m[2][2]; data[i+14] = m[3][2];
                data[i+ 3] = m[0][3]; data[i+ 7] = m[1][3]; data[i+11] = m[2][3]; data[i+15] = m[3][3];
            } else {
                data[i+ 0] = m[ 0];   data[i+ 4] = m[ 4];   data[i+ 8] = m[ 8];   data[i+12] = m[12];
                data[i+ 1] = m[ 1];   data[i+ 5] = m[ 5];   data[i+ 9] = m[ 9];   data[i+13] = m[13];
                data[i+ 2] = m[ 2];   data[i+ 6] = m[ 6];   data[i+10] = m[10];   data[i+14] = m[14];
                data[i+ 3] = m[ 3];   data[i+ 7] = m[ 7];   data[i+11] = m[11];   data[i+15] = m[15];
            }
        }
        this.getData = function() {
            return new Float32Array(heap, count<<6, 64>>2);
        }
        this.getRowMajor = function () {
            var i = count << 4;
            return [
                [ data[i+ 0], data[i+ 4], data[i+ 8], data[i+12] ],
                [ data[i+ 1], data[i+ 5], data[i+ 9], data[i+13] ],
                [ data[i+ 2], data[i+ 6], data[i+10], data[i+14] ],
                [ data[i+ 3], data[i+ 7], data[i+11], data[i+15] ]
            ];
        }
        Object.defineProperty(this, 'length', {
            get: function () {
                return count;
            }
        });
    }

    // IE shim, it doesn't appear to support asmjs anyway...
    if (typeof window != 'undefined' && typeof window.Math.fround == 'undefined')
        window.Math.fround = function (x) { return x; };
    if (typeof window != 'undefined' && typeof window.Math.imul == 'undefined')
        window.Math.imul = function (x, y) { return x * y; };

    return MatrixStack;
})();

const fs = require('fs');
const dgram = require('dgram');

class RtpUdpServerSocket {
	server = null;

	constructor(host,recognizeStream, RECOGNIZE_TIME) {
		this.server = dgram.createSocket('udp4');
		this.address = host.split(':')[0];
		this.port = host.split(':')[1];

		this.rs = recognizeStream;
		this.flag = true;

		this.server.on('error', (err) => {
			console.log(`server error:\n${err.stack}`);
			this.server.close();
		});

		this.server.on('close', (err) => {
			console.log(`server socket closed`);
		});

		let buf = null;
		let c = 0;
		this.server.on('message', (msg, rinfo) => {
			//console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
			if (!buf) {
					buf = msg.slice(12);
					//buf.swap16();
					// console.log('1');
					// console.log(buf);
				}
			else {
				if (c<10) {
					// console.log(c);
					// console.log(buf);
					let r = msg.slice(12);
					//let t = Buffer.alloc(buf.length+r.length);
					//t.write(buf,buf.length);
					//t.write(r,r.length)
					buf = Buffer.concat([buf,r]);
					//buf = t;
					//r.swap16();
					// console.log(typeof(buf));
					// console.log('%O',buf);

					//buf = buf + r;
					// console.log(c);
					// console.log(r);
					// console.log(c);

					c++;
				} else {
					// console.log('finish');
					// console.log(typeof(buf));
					buf.swap16();
					//console.log(buf);
					let ret = this.rs.write(buf);
					buf = null;
					c=0;
			}
		}
		});

		this.server.on('listening', () => {
			const address = this.server.address();
			console.log(`server listening ${address.address}:${address.port}`);
		});

		this.server.bind(this.port, this.address);
		return this.server;

	};

	close() {
		this.server.close();
	}
}


module.exports.RtpUdpServerSocket = RtpUdpServerSocket;

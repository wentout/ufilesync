'use strict';

const assert = require('assert');
const fs = require('fs-extra');
const _ = require('lodash');
const baseDirModule = './';
const baseDirPath = 'test_tmp';

const config = {
	exchange          : '',
	isRunSync         : true,
	isRunDebugMode    : false,
	debugCommands     : [],
	baseDir           : baseDirModule,
	queueNameSyncFiles: 'syncTest',
	watchDirs         : [`${baseDirPath}/sites`, `${baseDirPath}/sites2`],
	
	fileSendMethods: ['write', 'writeFile', 'createWriteStream', 'rename', 'move', 'copy', 'copyFile'],
	
	rabbitmq: {
		connectionConfig: {
			protocol : 'amqp',
			hostname : 'localhost',
			port     : 5672,
			username : 'guest',
			password : 'guest',
			locale   : 'en_US',
			frameMax : 0,
			heartbeat: 0,
		},
		queueConfig     : {
			autoDelete: true,
			mandatory : true,
			deliveryMode: true,
			durable   : false
		}
	},
	
	receivers   : {
		reserve: {
			domainName      : 'localhost',
			port            : 33800,
			maxFieldsSize   : 10 * 1024 * 1024 * 1024,
			uploadDir       : 'tmp',
			uploadDirBase   : '',
			isUseRemoveFiles: false,
		},
	},
	transmitters: {
		reserve: {
			domainName   : 'localhost',
			port         : 33800,
			pathToStorage: 'usync_storage/reserve',
			timeReconnect: 2000,
			queuePrefix  : 'for_test_usync_22'
		},
	},
};

const UFileSync = require('..');

const tests = function (uSync, isRun) {
	
	describe('Test deprecated methods', function () {
		
		it('openSync', function (done) {
			try {
				uSync.fs.openSync('testFile', 'w');
				done();
			} catch (err) {
				if (err instanceof uSync.exceptions.DeprecatedSyncFunctions) {
					assert.ok(1);
				} else {
					assert.ok(false);
				}
				done();
			}
		});
	});
	
	describe('Test decorator', function () {
		let fd;
		const fileName = 'tmpFile.txt';
		const siteDirPath = '/sites/a/b/c/abc-sitename';
		const fileNameSymlink = 'symlinkFile.txt';
		const fullPathToFile = `${baseDirPath}${siteDirPath}/${fileName}`;
		const fullPathToFileRelative = `./${baseDirPath}${siteDirPath}/${fileName}_2`;
		
		
		before(done => {
			fs.remove(baseDirPath, () => {
				uSync.on('ready', function () {
					done();
				});
			});
		});
		
		// it('writeFile gen err', function (done) {
		// 	uSync.fs.writeFile(fullPathToFile, 'example text...', err => {
		// 		console.log(err);
		//
		// 		// assert.ifError(err);
		// 		// assert.ok(err.stack);
		// 		done();
		// 	});
		// });
		
		it('mkdirp', function (done) {
			uSync.fs.mkdirp(baseDirPath + siteDirPath, err => {
				assert.ifError(err);
				done();
			});
		});
		
		it('writeFile', function (done) {
			uSync.fs.writeFile(fullPathToFile, 'example text...', err => {
				assert.ifError(err);
				done();
			});
		});
		
		it('writeFile custom task', function (done) {
			uSync.fs.writeFile(uSync.task('writeFile', fullPathToFile, 'custom write file'), fullPathToFile, 'example text...', err => {
				assert.ifError(err);
				done();
			});
		});
		
		
		it('copy file', function (done) {
			const fileName = `${fullPathToFile}_copy`;
			uSync.fs.copy(fullPathToFile, fileName, err => {
				assert.ifError(err);
				done();
			});
		});
		
		it('copy file with relative path "./"', function (done) {
			const fileNameSrc = '/tmp/testfile.tmp_123';
			const fileNameDest = fullPathToFileRelative;
			
			uSync.fs.writeFile(fileNameSrc, 'example text...', err => {
				assert.ifError(err);
				
				uSync.fs.copy(fileNameSrc, fileNameDest, err => {
					assert.ifError(err);
					done();
				});
			});
		});
		
		it('close', function (done) {
			uSync.fs.open(fullPathToFile, 'w', (err, _fd) => {
				fd = _fd;
				assert.ifError(err);
				
				uSync.fs.close(fd, err => {
					assert.ifError(err);
					done();
				});
			});
		});
		
		it('symlink', function (done) {
			const fileNameSrc = `${fullPathToFile}_symlink`;
			uSync.fs.writeFile(fileNameSrc, 'example text...', err => {
				assert.ifError(err);
				uSync.fs.symlink(fileNameSrc,`${baseDirPath}${siteDirPath}/${fileNameSymlink}`, err => {
					assert.ifError(err);
					done();
				});
			});
		});
		
		if (isRun) {
			it('close connection and reopen connection', function (done) {
				const fileNameSrc = `${fullPathToFile}_symlink_`;
				
				uSync.channel.close();
				
				uSync.fs.writeFile(fileNameSrc, 'example text...', err => {
					assert.ifError(err);
					uSync.fs.symlink(fileNameSrc, `${baseDirPath}${siteDirPath}/${fileNameSymlink}_2`, err => {
						assert.ifError(err);
						done();
					});
				});
			});
		}
		
		it('createWriteStream', function (done) {
			const newFileName = `${fullPathToFile}_by_stream`;
			const readStream = uSync.fs.createReadStream(fullPathToFile);
			const writeStream = uSync.fs.createWriteStream(newFileName);
			
			readStream.pipe(writeStream);
			
			writeStream.on('error', err => {
				assert.ifError(err);
			})
				.on('close', function () {
				
				});
			
			writeStream.on('finish', () => {
				uSync.fs.access(newFileName, (err) => {
					assert.ifError(err);
					
					done();
				});
			});
			
		});
		
		it('createWriteStream with skip task', function (done) {
			const newFileName = `${fullPathToFile}_by_stream`;
			const readStream = uSync.fs.createReadStream(fullPathToFile);
			const writeStream = uSync.fs.createWriteStream(uSync.taskSkip(), newFileName);
			
			readStream.pipe(writeStream);
			
			writeStream.on('error', err => {
				assert.ifError(err);
			});
			
			writeStream.on('finish', () => {
				uSync.fs.access(newFileName, (err) => {
					assert.ifError(err);
					
					done();
				});
			});
			
		});
		
		
		it('copy dir', function (done) {
			uSync.fs.copy(baseDirPath + siteDirPath, `${baseDirPath}${siteDirPath}_copy`, err => {
				assert.ifError(err);
				done();
			});
		});
		
		it('copy dir with option replace', function (done) {
			uSync.fs.copy(baseDirPath + siteDirPath, `${baseDirPath}${siteDirPath}_copy`, {replace: true}, err => {
				assert.ifError(err);
				done();
			});
		});
		
		it('unlink', function (done) {
			uSync.fs.unlink(fullPathToFile, err => {
				assert.ifError(err);
				done();
			});
		});
		
		it('unlink with taskSkip()', function (done) {
			uSync.fs.unlink(uSync.taskSkip(), fullPathToFileRelative, err => {
				assert.ifError(err);
				done();
			});
		});
		
		it('rimraf', function (done) {
			
			fs.remove(baseDirPath, err => {
				assert.ifError(err);
				
				fs.access(baseDirPath, fs.R_OK | fs.W_OK, (err) => {
					if (err) {
						assert.ok(1);
					} else {
						assert.ok(false);
					}
					done();
				});
				
			});
		});
		
	});
	
};


describe('Test with run synchronisation', function () {
	const uSync = new UFileSync.synchronisation(config);
	
	uSync.on('error', () => {
		// console.log(err);
	});
	
	tests(uSync, true);
});


//
describe('Test with shutdown synchronisation', function () {
	const uSync2 = new UFileSync.synchronisation(_.extend({isRunSync: false}, config));
	
	uSync2.on('error', () => {
		// console.log(err);
	});
	
	tests(uSync2, false);
});

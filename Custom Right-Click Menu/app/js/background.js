function sandbox(code) {
	var result;
	console.log(code);
	console.log(Arguments);
	eval(code);
	// ReSharper disable once UsageOfPossiblyUnassignedValue
	return result;
}

function mainContainer() {

	var crmTree;
	var keys = {};
	var storageSync;
	var secretKeys = {};
	var contextMenuIds = {};
	var toExecuteNodes = {
		onUrl: [],
		always: []
	};
	var stylesheetNodeStatusses = {};
	var chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

	var crmByIdSafe = {};

	function safe(node) {
		return crmByIdSafe[node.id];
	}

	function createSecretKey() {
		var key = [];
		var i;
		for (i = 0; i < 25; i++) {
			key[i] = chars[Math.round(Math.random() * 61)];
		}
		if (!keys[key]) {
			keys[key] = true;
			return key;
		} else {
			return createSecretKey();
		}
	}

	/*#region Right-Click Menu Handling*/

	console.log(chrome);
	console.log(chrome.tabs);
	console.log(chrome.tabs.onHighlighted);
	chrome.tabs.onHighlighted.addListener(function(highlightInfo) {
		var lastTab = highlightInfo.tabIds[highlightInfo.tabIds.length - 1];
		for (var node in stylesheetNodeStatusses) {
			if (stylesheetNodeStatusses.hasOwnProperty(node)) {
				chrome.contextMenus.update(contextMenuIds[node], {
					checked: stylesheetNodeStatusses[node][lastTab]
				});
			}
		}
	});

	function getContexs(contexts) {
		var newContexts = [];
		var textContexts = ['page', 'link', 'selection', 'image', 'video', 'audio'];
		for (var i = 0; i < 6; i++) {
			if (contexts[i]) {
				newContexts.push(textContexts[i]);
			}
		}
		return newContexts;
	}

	function sanitizeUrl(url) {
		if (url.indexOf('://') === -1) {
			url = 'http://' + url;
		}
		console.log(url);
		return url;
	}

	function createLinkClickHandler(node) {
		return function(clickData, tabData) {
			var i;
			var finalUrl;
			for (i = 0; i < node.value.length; i++) {
				if (node.value[i].newTab) {
					chrome.tabs.create({
						windowId: tabData.windowId,
						url: sanitizeUrl(node.value[i].url),
						openerTabId: tabData.id
					});
				}
				else {
					finalUrl = node.value[i].url;
				}
			}
			if (finalUrl) {
				chrome.tabs.update(tabData.tabId, {
					url: sanitizeUrl(finalUrl)
				});
			}
		}
	}

	function createStylesheetClickHandler(node) {
		return function (info, tab) {
			var code;
			var className = node.id + '' + tab.id;
			if (stylesheetNodeStatusses[node.id][tab.id]) {
				code = 'var nodes = document.querySelectorAll(' + className + ');var i;var length = nodes.length;for (i = 0; i < length; i++) {nodes[i].remove();}';
			} else {
				var css = node.value.stylesheet.replace(/[ |\n]/g, '');
				code = 'var CRMSSInsert=document.createElement("style");CRMSSInsert.className=' + className + ';CRMSSInsert.type="text/css";CRMSSInsert.appendChild(document.createTextNode("' + css + '"));document.head.appendChild(CRMSSInsert);';
			}
			stylesheetNodeStatusses[node.id][tab.id] = !stylesheetNodeStatusses[node.id][tab.id];
			chrome.contextMenus.update(contextMenuIds[node.id], {
				checked: (stylesheetNodeStatusses[node.id][tab.id] = !stylesheetNodeStatusses[node.id][tab.id])
			});
			console.log(code);
			console.log(eval(code));
			chrome.tabs.executeScript(tab.id, {
				code: code,
				allFrames: true
			});
		}
	}

	function createScriptClickHandler(node) {
		return function (info, tab) {
			var key = [];
			var err = false;
			try {
				key = createSecretKey();
			} catch (e) {
				//There somehow was a stack overflow
				err = e;
			}
			if (err) {
				console.log(err);
				chrome.tabs.executeScript(tab.id, {
					code: 'alert("Something went wrong very badly, please go to your Custom Right-Click Menu options page and remove any sketchy scripts.")'
				}, function() {
					chrome.runtime.reload();
				});
			} else {
				var code = 'var crmAPI = new CrmAPIInit(' +
					JSON.stringify(safe(node)) + ',' +
					node.id + ',' +
					JSON.stringify(tab) + ',' +
					JSON.stringify(info) + ',' +
					JSON.stringify(key) + ');';
				code = code + node.value.script;
				chrome.tabs.executeScript(tab.id, {
					code: code,
					file: 'js/crmapi.js'
				});
			}
		}
	}

	function createOptionsPageHandler() {
		return function() {
			chrome.runtime.openOptionsPage();
		}
	}

	function createNode(node, parentId) {
		var i;
		var id;
		var length;
		var triggerIndex;
		if (node.value && (node.value.launchMode === 1 || node.value.launchMode === 2)) {
			if (node.value.launchMode === 1) {
				toExecuteNodes.always.push(node);
			} else {
				length = node.triggers && node.triggers.length;
				for (i = 0; i < length; i++) {
					triggerIndex = toExecuteNodes.onUrl[node.triggers[i]];
					if (triggerIndex) {
						triggerIndex.push(node);
					} else {
						triggerIndex = [node];
					}
				}
			}
		} else {
			if (node.type === 'stylesheet' && node.value.toggle && node.value.defaultOn) {
				if (node.value.launchMode === 0) {
					toExecuteNodes.always.push(node);
				} else {
					length = node.triggers && node.triggers.length;
					for (i = 0; i < length; i++) {
						triggerIndex = toExecuteNodes.onUrl[node.triggers[i]];
						if (triggerIndex) {
							triggerIndex.push(node);
						} else {
							triggerIndex = [node];
						}
					}
				}
			}
			var cm = {
				title: node.name,
				contexts: getContexs(node.onContentTypes),
				checked: (node.type === 'stylesheet' && node.value.toggle && node.value.defaultOn),
				parentId: parentId
			};
			stylesheetNodeStatusses[node.id] = {};
			if (node.type === 'divider') {
				cm.type = 'separator';
			} else if (node.type === 'stylesheet' && node.value.toggle) {
				cm.type = 'checkbox';
			}

			if (node.value && node.value.launchMode === 3 && node.triggers) {
				var triggers = [];
				for (i = 0; i < node.triggers.length; i++) {
					if (node.triggers[i].split('//')[1].indexOf('/') === -1) {
						triggers.push(node.triggers[i] + '/');
					} else {
						triggers.push(node.triggers[i]);
					}
				}
				cm.documentUrlPatterns = triggers;
			}
			if (node.type === 'link') {
				cm.onclick = createLinkClickHandler(node);
			} else if (node.type === 'script') {
				cm.onclick = createScriptClickHandler(node);
			} else if (node.type === 'stylesheet') {
				cm.onclick = createStylesheetClickHandler(node);
			}
			console.log(cm);
			id = chrome.contextMenus.create(cm, function() {
				if (chrome.runtime.lastError) {
					if (cm.documentUrlPatterns) {
						console.log('An error occurred with your context menu, attempting again with no url matching.', chrome.runtime.lastError);
						delete cm.documentUrlPatterns;
						id = chrome.contextMenus.create(cm, function() {
							id = chrome.contextMenus.create({
								title: 'ERROR',
								onclick: createOptionsPageHandler()
							});
							console.log('Another error occured with your context menu!', chrome.runtime.lastError);
						});
					} else {
						console.log('An error occured with your context menu!', chrome.runtime.lastError);
					}
				}
			});
		}
		return id;
	}

	function buildPageCrmParse(node, parentId) {
		var i;
		var id = createNode(node, parentId);
		contextMenuIds[node.id] = id;
		if (id !== undefined) {
			if (node.children) {
				var length = node.children.length;
				for (i = 0; i < length; i++) {
					buildPageCrmParse(node.children[i], id);
				}
			}
		}
	}

	function buildPageCRM() {
		var i;
		var length = crmTree.length;
		stylesheetNodeStatusses = {};
		chrome.contextMenus.removeAll();
		var rootId = chrome.contextMenus.create({
			title: 'Custom Menu',
			contexts: ['page', 'selection', 'link', 'image', 'video', 'audio']
		});;
		toExecuteNodes = {
			onUrl: [],
			always: []
		};
		for (i = 0; i < length; i++) {
			buildPageCrmParse(crmTree[i], rootId);
		}
		if (storageSync.showOptions) {
			chrome.contextMenus.create({
				type: 'separator',
				parentId: rootId
			});
			chrome.contextMenus.create({
				title: 'Options',
				onclick: createOptionsPageHandler(),
				parentId: rootId
			});
		}
	}

	function escapeRegExp(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g, '\\$&').replace(/\*/g, '.+');
	}

	function matchesUrl(matchPattern, url) {
		//Split it
		var matchHost;
		var urlHost;
		var matchPath;
		var urlPath;

		var matchPatternSplit = matchPattern.split('://');
		var matchScheme = matchPatternSplit[0];
		if (matchPatternSplit[1].indexOf('/') === -1) {
			matchHost = matchPatternSplit[1];
			matchPath = '/';
		} else {
			matchPatternSplit = matchPatternSplit[1].split('/');
			matchHost = matchPatternSplit.splice(0,1);
			matchPath = matchPatternSplit.join('/');
		}

		var urlPatternSplit = url.split('://');
		var urlScheme = urlPatternSplit[0];
		if (urlPatternSplit[1].indexOf('/') === -1) {
			urlHost = urlPatternSplit[1];
			urlPath = '/';
		} else {
			urlPatternSplit = urlPatternSplit[1].split('/');
			urlHost = urlPatternSplit.splice(0, 1);
			urlPath = urlPatternSplit.join('/');
		}

		if (matchScheme !== '*' && matchScheme !== urlScheme) {
			return false;
		}
		matchHost = new RegExp(escapeRegExp(matchHost));
		if (!matchHost.test(urlHost)) {
			return false;
		}

		matchPath = new RegExp(escapeRegExp(matchPath));
		return matchPath.test(urlPath);
	}

	function executeNode(node, tab) {
		if (node.type === 'script') {
			createScriptClickHandler(node)({}, tab);
		}
		else if (node.type === 'stylesheet') {
			stylesheetNodeStatusses[node.id][tab.id] = false;
			createStylesheetClickHandler(node)({}, tab);
		}
		else if (node.type === 'link') {
			createLinkClickHandler(node)({}, tab);
		}
	}

	chrome.tabs.onUpdated.addListener(function(tabId, updatedInfo) {
		if (updatedInfo.url) {
			//Url changed or was set
			if (updatedInfo.url.indexOf('chrome://') !== 0) {
				//Not an active tab, execute all that needs to be executed
				chrome.tabs.get(tabId, function(tab) {
					var i;
					var length = toExecuteNodes.always.length;
					for (i = 0; i < length; i++) {
						executeNode(toExecuteNodes.always[i], tab);
					}
					for (var key in toExecuteNodes.onUrl) {
						if (toExecuteNodes.onUrl.hasOwnProperty(key)) {
							if (matchesUrl(key, updatedInfo.url)) {
								length = toExecuteNodes.onUrl[key].length;
								for (i = 0; i < length; i++) {
									executeNode(toExecuteNodes.onUrl[key][i], tab);
								}
							}
						}
					}
				});
			}
		}
	});

	/*#endregion*/

	///<reference path="../../scripts/_references.js"/>
	///<reference path="e.js"/>
	/*#region Handling of crmapi.js*/
	var permissions = [
		'alarms',
		'background',
		'bookmarks',
		'browsingData',
		'clipboardRead',
		'clipboardWrite',
		'contentSettings',
		'cookies',
		'contentSettings',
		'declarativeContent',
		'desktopCapture',
		'downloads',
		'history',
		'identity',
		'idle',
		'management',
		'notifications',
		'pageCapture',
		'power',
		'printerProvider',
		'privacy',
		'sessions',
		'system.cpu',
		'system.memory',
		'system.storage',
		'topSites',
		'tabCapture',
		'tts',
		'webNavigation',
		'webRequest',
		'webRequestBlocking'
	];

	var availablePermissions = [];
	var storageLocal;
	var safeTree;
	var crmById = {};

	function pushIntoArray(toPush, position, target) {
		var length = target.length + 1;
		var temp1 = target[position];
		var temp2 = toPush;
		for (var i = position; i < length; i++) {
			target[i] = temp2;
			temp2 = temp1;
			temp1 = target[i + 1];
		}
		return target;
	}

	function generateItemId(callback) {
		window.chrome.storage.local.get('latestId', function(items) {
			var id;
			if (items.latestId) {
				id = items.latestId;
			} else {
				id = 1;
				window.chrome.storage.local.set({ latestId: 1 });
			}
			callback && callback(id);
		});
	}

	function refreshPermissions() {
		window.chrome.permisions.getAll(function(available) {
			availablePermissions = available.permissions;
		});
	}

	function removeStorage(node) {
		if (node.children && node.children.length > 0) {
			for (var i = 0; i < node.children.length; i++) {
				removeStorage(node);
			}
		} else {
			delete node.storage;
		}
	}

	function lookup(path, data, hold) {
		if (path === null || typeof path !== 'object' || Array.isArray(path)) {
			this.respondError('Supplied path is not of type array');
			return true;
		}
		var length = path.length;
		hold && length--;
		for (var i = 0; i < length; i++) {
			if (data) {
				data = data[path[i]];
			} else {
				return false;
			}
		}
		if (data === undefined) {
			return false;
		}
		return data;
	}

	function makeSafe(node) {
		var newNode = {
			id: node.id,
			path: node.path,
			type: node.type,
			name: node.name,
			value: node.value,
			linkVal: node.linkVal,
			menuVal: node.menuVal,
			children: node.children,
			scriptVal: node.scriptVal,
			stylesheetval: node.stylesheetVal
		};
		return newNode;
	}

	function parseNode(node, isSafe) {
		if (node.children && node.children.length > 0) {
			for (var i = 0; i < node.children.length; i++) {
				parseNode(node.children[i], safe);
			}
		} else {
			if (isSafe) {
				crmByIdSafe[node.id] = safe(node);
			} else {
				crmById[node.id] = node;
			}
		}
	}

	function buildByIdObjects(crm) {
		for (var i = 0; i < crm.length; i++) {
			parseNode(crm);
			parseNode(safeTree, true);
		}
	}

	function safeTreeParse(node) {
		if (node.children) {
			var children = [];
			for (var i = 0; i < node.children.length; i++) {
				children.push(safeTreeParse(node.children[i]));
			}
			node.children = children;
		}
		return makeSafe(node);
	}

	function buildSafeTree(crm) {
		var treeCopy = JSON.parse(JSON.stringify(crm));
		var safeTree = [];
		for (var i = 0; i < treeCopy.length; i++) {
			safeTree.push(safeTreeParse(treeCopy[i]));
		}
		return safeTree;
	}

	function updateStorage() {
		window.chrome.storage.sync.get(function(data) {
			storageSync = data;
			window.chrome.storage.local.get(function(locals) {
				storageLocal = locals;
				crmTree = data.crm;
				safeTree = buildSafeTree(data.crm);
				buildByIdObjects(data.crm);
			});
		});
	}

	function updateCrm(skipPageCrm) {
		window.chrome.storage.sync.set({
			crm: crmTree
		});
		updateStorage();
		skipPageCrm && buildPageCRM();
	}

	function updateNodeStorage(message) {
		crmById[message.id].storage = message.storage;
		updateStorage();
	}

	function crmFunction(message, toRun) {
		var _this = this;
		this.toRun = toRun;
		this.message = message;

		this.respondSuccess = function() {
			var args = [];
			for (var i = 0; i < Arguments.length; i++) {
				args.push(Arguments[i]);
			}
			this.message.onFinish('success', args);
			return true;
		};

		this.respondError = function(error) {
			this.message.onFinish('error', error);
			return true;
		};

		this.lookup = function(path, data, hold) {
			return lookup(path, data, hold);
		};

		this.checkType = function(toCheck, type, name, optional, ifndef, array, ifdef) {
			if (!toCheck) {
				if (optional) {
					ifndef && ifndef();
					return true;
				} else {
					if (array) {
						_this.respondError('Not all values for ' + name + ' are defined');
					} else {
						_this.respondError('Value for ' + name + ' is not defined');
					}
					return false;
				}
			} else {
				if (type === 'array') {
					if (typeof toCheck !== 'object' || Array.isArray(toCheck)) {
						if (array) {
							_this.respondError('Not all values for ' + name + ' are of type ' + type);
						} else {
							_this.respondError('Value for ' + name + ' is not of type ' + type);
						}
						return false;
					}
				}
				if (typeof toCheck !== type) {
					if (array) {
						_this.respondError('Not all values for ' + name + ' are of type ' + type);
					} else {
						_this.respondError('Value for ' + name + ' is not of type ' + type);
					}
					return false;
				}
			}
			ifdef && ifdef();
			return true;
		};

		this.moveNode = function(node, position) {
			var relativeNode;
			var parentChildren;
			if (position) {
				if (!_this.checkType(position, 'object', 'position')) {
					return false;
				}
				if (!_this.checkType(position.node, 'number', 'node', true, function() {
					relativeNode = crmTree;
				})) {
					return false;
				}
				if (!_this.checkType(position.relation, 'string', 'relation', true, function() {
					position.relation = 'firstSibling';
					relativeNode = crmTree;
				})) {
					return false;
				}
				relativeNode = relativeNode || _this.getNodeFromId(_this.message.options.node, false, true);
				if (relativeNode === false) {
					return false;
				}
				switch (position.relation) {
				case 'before':
					if (relativeNode) {
						parentChildren = _this.lookup(relativeNode.path, crmTree, true);
						if (relativeNode.path.length > 0) {
							pushIntoArray(node, relativeNode.path[relativeNode.path.length - 1], parentChildren);
						} else {
							_this.respondError('Suppplied node is the root of the crm tree, supply no node to append to root');
						}
						break;
					}
				case 'firstSibling':
					if (relativeNode) {
						parentChildren = _this.lookup(relativeNode.path, crmTree, true);
						pushIntoArray(node, 0, parentChildren);
						break;
					}
				case 'firstChild':
					if (relativeNode) {
						if (relativeNode.type !== 'menu') {
							_this.respondError('Supplied node is not of type "menu"');
							return false;
						}
						pushIntoArray(node, 0, relativeNode.children);
					} else {
						pushIntoArray(node, 0, crmTree);
					}
					break;
				case 'after':
					if (relativeNode) {
						parentChildren = _this.lookup(relativeNode.path, crmTree, true);
						if (relativeNode.path.length > 0) {
							pushIntoArray(node, relativeNode.path[relativeNode.path.length + 1] + 1, parentChildren);
						} else {
							_this.respondError('Suppplied node is the root of the crm tree, supply no node to append to root');
						}
						break;
					}
				case 'lastSibling':
					if (relativeNode) {
						parentChildren = _this.lookup(relativeNode.path, crmTree, true);
						pushIntoArray(node, parentChildren.length - 1, parentChildren);
						break;
					}
					break;
				case 'lastChild':
					if (relativeNode) {
						if (relativeNode.type !== 'menu') {
							_this.respondError('Supplied node is not of type "menu"');
							return false;
						}
						pushIntoArray(node, relativeNode.children.length - 1, relativeNode.children);
					} else {
						pushIntoArray(node, relativeNode.children.length - 1, crmTree);
					}
					break;
				}
			} else {
				//Place in default position, firstChild of root
				pushIntoArray(node, 0, crmTree);
			}
			return true;
		};

		this.getNodeFromId = function(id, safe, noCallback) {
			var node = (safe ? crmByIdSafe : crmById)[id];
			if (node) {
				if (noCallback) {
					return node;
				}
				return {
					run: function(callback) {
						callback(node);
					}
				};
			} else {
				_this.respondError('There is no node with the id you supplied (' + id + ')');
				if (noCallback) {
					return false;
				}
				return {
					run: function() {}
				};
			}
		};

		this.typeCheck = function(toCheck, callback) {
			var i, j, k, l;
			var toCheckName;
			var toCheckTypes;
			var toCheckValue;
			var toCheckIsArray;
			var optionals = [];
			var toCheckTypesLength;
			var toCheckChildrenName;
			var toCheckChildrenType;
			var toCheckChildrenValue;
			var toCheckChildrenTypes;
			var toCheckChildrenLength;
			var toCheckChildrenTypesLength;
			for (i = 0; i < toCheck.length; i++) {
				if (toCheck[i].dependency !== undefined) {
					if (!optionals[toCheck[i].dependency]) {
						optionals[i] = false;
						continue;
					}
				}
				toCheckName = toCheck[i].val;
				toCheckTypes = toCheck[i].type.split('|');
				toCheckValue = _this.message[toCheckName];
				if (toCheckValue === undefined || toCheckValue === null) {
					if (toCheck[i].optional) {
						optionals[i] = false;
						continue;
					} else {
						_this.respondError('Value for ' + toCheckName + ' is not set');
						return false;
					}
				} else {
					toCheckTypesLength = toCheckTypes.length;
					toCheckIsArray = Array.isArray(toCheckValue);
					for (j = 0; j < toCheckTypesLength; j++) {
						if (toCheckTypes[j] === 'array') {
							if (typeof toCheckValue !== 'object' || !Array.isArray(toCheckValue)) {
								_this.respondError('Value for ' + toCheckName + ' is not of type ' + type);
								return false;
							}
						} else if (typeof toCheckValue !== toCheckTypes[j]) {
							_this.respondError('Value for ' + toCheckName + ' is not of type ' + type);
							return false;
						}
					}
					optionals[i] = true;
					if (toCheck[i].min && typeof toCheckValue === 'number') {
						if (toCheck[i].min > toCheckValue) {
							_this.respondError('Value for ' + toCheckName + ' is smaller than ' + toCheck[i].min);
							return false;
						}
					}
					if (toCheck[i].max && typeof toCheckValue === 'number') {
						if (toCheck[i].max < toCheckValue) {
							_this.respondError('Value for ' + toCheckName + ' is bigger than ' + toCheck[i].max);
							return false;
						}
					}
					if (toCheckTypes[j] === 'array' && toCheck[i].forChildren) {
						toCheckChildrenLength = toCheck[i].forChildren.length;
						for (j = 0; j < toCheckIsArray; j++) {
							for (k = 0; k < toCheckChildrenLength; k++) {
								toCheckChildrenName = toCheck[i].forChildren[k].val;
								toCheckChildrenValue = toCheckValue[j][toCheckChildrenName];
								if (toCheckChildrenValue === undefined || toCheckChildrenValue === null) {
									if (!toCheck[i].forChildren[k].optional) {
										_this.respondError('For not all values in the array ' + toCheckName + ' is the property ' + toCheckChildrenName + ' defined');
										return false;
									} else {
										toCheckChildrenType = toCheck[i].forChildren[k].type;
										toCheckChildrenTypes = toCheckChildrenType.split('|');
										toCheckChildrenTypesLength = toCheckChildrenTypes.length;
										for (l = 0; l < toCheckChildrenTypesLength; l++) {
											if (toCheckChildrenTypes[l] === 'array') {
												if (typeof toCheckChildrenValue !== 'object' || Array.isArray(toCheckChildrenValue) === undefined) {
													_this.respondError('For not all values in the array ' + toCheckName + ' is the property ' + toCheckChildrenName + ' of type ' + toCheckChildrenType);
													return false;
												}
											} else if (typeof toCheckChildrenValue !== toCheckChildrenTypes[l]) {
												_this.respondError('For not all values in the array ' + toCheckName + ' is the property ' + toCheckChildrenName + ' of type ' + toCheckChildrenType);
												return false;
											}
										}
									}
								}
							}
						}
					}
				}
			}
			callback(optionals);
			return true;
		};

		this.checkPermissions = function(permissions, callbackOrOptional, callback) {
			var optional = [];
			if (callbackOrOptional !== undefined && callbackOrOptional !== null && typeof callbackOrOptional === 'object') {
				optional = callbackOrOptional;
			} else {
				callback = callbackOrOptional;
			}
			var permitted = true;
			var notPermitted = [];
			var node = _this.getNodeFromId(message.id, false, true);
			if (node.isLocal) {
				callback && callback(optional);
			} else {
				var i;
				for (i = 0; i < permissions.length; i++) {
					if (node.permissions.indexOf(permissions[i]) === -1) {
						permitted = false;
						notPermitted.push(permissions[i]);
					}
				}

				if (!permitted) {
					_this.respondError('Permission' + (notPermitted.length === 1 ? ' ' + notPermitted[0] : 's ' + notPermitted.join(', ')) + ' are not available to this script.');
				} else {
					var length = optional.length;
					for (i = 0; i < length; i++) {
						if (node.permissions.indexOf(optional[i]) === -1) {
							optional.splice(i, 1);
							length--;
							i--;
						}
					}
					callback && callback(optional);
				}
			}
		};

		this.crmFunctions = {
			getTree: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.respondSuccess(safeTree);
				});
			},
			getSubTree: function(id) {
				_this.checkPermissions(['crmGet'], function() {
					if (id || (_this.message.nodeId && typeof _this.message.nodeId === 'number')) {
						var node = crmByIdSafe[id || _this.message.nodeId];
						if (node) {
							_this.respondSuccess(node);
						} else {
							_this.respondError('There is no node with id ' + (id || _this.message.nodeId));
						}
					} else {
						_this.respondError('No nodeId supplied');
					}
				});
			},
			getNode: function() {
				this.getSubTree();
			},
			getNodeIdFromPath: function(path) {
				_this.checkPermissions(['crmGet'], function() {
					var pathToSearch = path || _this.message.path;
					var lookedUp = lookup(pathToSearch, safeTree, false);
					if (lookedUp === true) {
						return false;
					} else if (lookedUp === false) {
						_this.respondError('Path does not return a valid value');
						return false;
					} else {
						_this.respondSuccess(lookedUp.id);
						return lookedUp.id;
					}
				});
			},
			queryCrm: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.typeCheck([
						{
							val: 'query',
							type: 'object'
						}, {
							val: 'query.type',
							type: 'string',
							optional: true
						}, {
							val: 'query.inSubTree',
							type: 'number',
							optional: true
						}, {
							val: 'query.name',
							type: 'string',
							optional: true
						}
					], [], function(optionals) {
						var i;
						var searchScopeArray = [];

						function findType(tree, type) {
							if (tree.children) {
								var treeChildrenLength = tree.children.length;
								for (i = 0; i < treeChildrenLength; i++) {
									findType(tree.children[i], type);
								}
							} else {
								if (type) {
									tree.type === type && searchScopeArray.push(tree);
								} else {
									searchScopeArray.push(tree);
								}
							}
						}

						var searchScope;
						if (optionals[2]) {
							searchScope = _this.getNodeFromId(_this.message.query.inSubTree, false, true);
						}
						searchScope = searchScope || safeTree;

						findType(searchScope, _this.message.query.type);

						if (optionals[3]) {
							var searchScopeLength = searchScopeArray.length;
							for (i = 0; i < searchScopeLength; i++) {
								if (searchScopeArray[i].name !== _this.message.query.name) {
									searchScopeArray.splice(i, 1);
									searchScopeLength--;
									i--;
								}
							}
						}

						_this.respondSuccess(searchScopeArray);
					});
				});
			},
			getParentNode: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId).run(function(node) {
						var pathToSearch = JSON.parse(JSON.stringify(node.path));
						pathToSearch.pop();
						var parentId = this.getNodeIdFromPath(pathToSearch);
						if (parentId !== false) {
							_this.respondSuccess(_this.getNodeFromId(parentId, true, true));
						}
					});
				});
			},
			getChildren: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId, true).run(function(node) {
						_this.respondSuccess(node.children || []);
					});
				});
			},
			getNodeType: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId, true).run(function(node) {
						_this.respondSuccess(node.type);
					});
				});
			},
			getNodeValue: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId, true).run(function(node) {
						_this.respondSuccess(node.value);
					});
				});
			},
			createNode: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'id',
							type: 'number'
						}, {
							val: 'linkData',
							type: 'array',
							forChildren: [
								{
									val: 'url',
									type: 'string'
								}, {
									val: 'newTab',
									type: 'boolean',
									optional: true
								}
							],
							optional: true
						}, {
							val: 'scriptData',
							type: 'object',
							optional: true
						}, {
							dependency: 2,
							val: 'scriptData.script',
							type: 'string'
						}, {
							dependency: 2,
							val: 'scriptData.launchMode',
							type: 'number',
							optional: true,
							min: 0,
							max: 3
						}, {
							dependency: 2,
							val: 'scriptData.triggers',
							type: 'array',
							optional: true,
							forChildren: [
								{
									val: 'url',
									type: 'string'
								}
							]
						}, {
							dependency: 2,
							val: 'scriptData.libraries',
							type: 'array',
							optional: true,
							forChildren: [
								{
									val: 'name',
									type: 'string'
								}
							]
						}, {
							val: 'stylesheetData',
							type: 'object',
							optional: true
						}, {
							dependency: 7,
							val: 'stylesheetData.launchMode',
							type: 'number',
							min: 0,
							max: 3,
							optional: true
						}, {
							dependency: 7,
							val: 'stylesheetData.triggers',
							type: 'array',
							forChildren: [
								{
									val: 'url',
									type: 'string'
								}
							],
							optional: true
						}, {
							dependency: 7,
							val: 'stylesheetData.toggle',
							type: 'boolean',
							optional: true
						}, {
							dependency: 7,
							val: 'stylesheetData.defaultOn',
							type: 'boolean',
							optional: true
						}
					], function(optionals) {
						generateItemId(function(id) {
							var i;
							var type = (_this.message.options.type === 'link' ||
								_this.message.options.type === 'script' ||
								_this.message.options.type === 'stylesheet' ||
								_this.message.options.type === 'menu' ||
								_this.message.options.type === 'divider' ? _this.message.options.type : 'link');
							var node = {
								type: type,
								name: _this.message.options.name || 'name',
								id: id,
								children: []
							};
							_this.getNodeFromId(_this.message.id, false, true).local && (node.local = true);
							if (type === 'link') {
								if (optionals[1]) {
									node.value = _this.message.options.linkData;
									var nodeNewTab;
									var value = node.value;
									var nodeValueLength = value.length;
									for (i = 0; i < nodeValueLength; i++) {
										nodeNewTab = node.value[i].newTab;
										nodeNewTab = (nodeNewTab === false ? false : true);
									}
								} else {
									node.value = [
										{
											url: 'http://example.com',
											newTab: true
										}
									];
								}
							} else if (type === 'script') {
								node.value = {
									script: _this.message.options.scriptData.script,
									launchMode: (optionals[4] ? _this.message.options.scriptData.launchMode : 0),
									triggers: _this.message.options.scriptData.triggers || [],
									libraries: _this.message.options.scriptData.libraries || []
								};
							} else if (type === 'stylesheet') {
								node.value = {
									stylesheet: _this.message.options.stylesheetData.stylesheet,
									launchMode: (optionals[8] ? _this.message.options.stylesheetData.launchMode : 0),
									triggers: _this.message.options.stylesheetData.triggers || [],
									toggle: (_this.message.options.stylesheetData.toggle === false ? false : true),
									defaultOn: (_this.message.options.stylesheetData.defaultOn === false ? false : true)
								};
							} else {
								node.value = {};
							}

							if (moveNode(node, _this.message.options.position)) {
								updateCrm();
								_this.respondSuccess(node);
							}
							return true;
						});
					});
				});
			},
			copyNode: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'options',
							type: 'object'
						}, {
							val: 'options.name',
							type: 'string',
							optional: true
						}
					], function(optionals) {
						_this.getNodeFromId(_this.message.nodeId, true).run(function(node) {
							var newNode = JSON.parse(JSON.stringify(node));
							generateItemId(function(id) {
								newNode.id = id;
								if (_this.getNodeFromId(_this.message.id, false, true).local === true && node.local === true) {
									newNode.local = true;
								}
								delete newNode.storage;
								delete newNode.file;
								if (optionals[1]) {
									newNode.name = _this.message.options.name;
								}
								if (moveNode(newNode, _this.message.options.position)) {
									updateCrm();
									_this.respondSuccess(newNode);
								}
								return true;
							});
							return true;
						});
					});
				});
				return true;
			},
			moveNode: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.getNodeFromId(_this.message.nodeId).run(function(node) {
						if (moveNode(node, _this.message.options.position)) {
							updateCrm();
							_this.respondSuccess(safe(node));
						}
					});
				});
			},
			deleteNode: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.getNodeFromId(_this.message.nodeId).run(function(node) {
						var parentChildren = _this.lookup(node.path, crmTree, true);
						parentChildren.splice(node.path[node.path.length - 1], 1);
						chrome.contextMenus.remove(contextMenuIds[node.id], function() {
							updateCrm(true);
							_this.respondSuccess(true);
						});
					});
				});
			},
			editNode: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'options',
							type: 'object'
						}, {
							val: 'options.name',
							type: 'string',
							optional: true
						}, {
							val: 'options.type',
							type: 'string',
							optional: true
						}
					], function(optionals) {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							if (optionals[2]) {
								if (_this.message.options.type !== 'link' &&
									_this.message.options.type !== 'script' &&
									_this.message.options.type !== 'stylesheet' &&
									_this.message.options.type !== 'menu' &&
									_this.message.options.type !== 'divider') {
									_this.respondError('Given type is not a possible type to switch to, use either script, stylesheet, link, menu or divider');
									return false;
								} else {
									node.type = _this.message.options.type;
								}
							}
							if (optionals[1]) {
								node.name = _this.message.options.name;
							}
							updateCrm();
							_this.respondSuccess(safe(node));
							return true;
						});
					});
				});
			},
			getContentTypes: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId).run(function(node) {
						_this.respondSuccess(node.onContentTypes);
					});
				});
			},
			setContentType: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'index',
							type: 'number',
							min: 0,
							max: 5
						}, {
							val: 'value',
							type: 'boolean'
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							node.onContentTypes[_this.message.index] = _this.message.value;
							updateCrm(true);
							chrome.contextMenus.update(contextMenuIds[node.id], {
								contexts: getContexs(node.onContentTypes)
							}, function() {
								updateCrm(true);
								_this.respondSuccess(node.onContentTypes);
							});
						});
					});
				});
			},
			setContentTypes: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'contentTypes',
							type: 'array'
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							var length = _this.message.contentTypes.length;
							for (var i = 0; i < length; i++) {
								if (typeof _this.message.contentTypes[i] !== 'boolean') {
									_this.respondError('Not all values in array childrenIds are of type boolean');
									return false;
								}
							}
							node.onContentTypes = _this.message.contentTypes;
							chrome.contextMenus.update(contextMenuIds[node.id], {
								contexts: getContexs(node.onContentTypes)
							}, function() {
								updateCrm(true);
								_this.respondSuccess(safe(node));
							});
							return true;
						});
					});
				});
			},
			linkGetLinks: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId).run(function(node) {
						if (node.type === 'link') {
							_this.respondSuccess(node.value);
						} else {
							_this.respondSuccess(node.linkval);
						}
						return true;
					});

				});
			},
			linkPush: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'items',
							type: 'object|array',
							forChildren: [
								{
									val: 'newTab',
									type: 'boolean',
									optional: true
								}, {
									val: 'url',
									type: 'string'
								}
							]
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							var itemsLength = _this.message.items.length;
							if (itemsLength !== undefined) { //Array
								for (var i = 0; i < itemsLength; i++) {
									_this.message.items[i].newTab = (_this.message.items[i].newTab === false ? false : true);
								}
								if (node.type === 'link') {
									node.value.push(_this.message.items);
								} else {
									node.linkVal = node.linkVal || [];
									node.linkVal.push(_this.message.items);
								}
							} else { //Object
								if (_this.message.items.newTab !== undefined) {
									if (typeof _this.message.items.newTab !== 'boolean') {
										_this.respondError('The newtab property in given item is not of type boolean');
										return false;
									}
								}
								if (!_this.message.items.url) {
									_this.respondError('The URL property is not defined in the given item');
									return false;
								}
								if (node.type === 'link') {
									node.value.push(_this.message.items);
								} else {
									node.linkVal.push = node.linkVal.push || [];
									node.linkVal.push(_this.message.items);
								}
							}
							updateCrm(true);
							if (node.type === 'link') {
								_this.respondSuccess(safe(node).value);
							} else {
								_this.respondSuccess(safe(node).linkVal);
							}
							return true;
						});
					});
				});
			},
			linkSplice: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.getNodeFromId(_this.message.nodeId).run(function(node) {
						_this.typeCheck([
							{
								val: 'start',
								type: 'number'
							}, {
								val: 'amount',
								type: 'number'
							}
						], [
							function() {
								var spliced;
								if (node.type === 'link') {
									spliced = node.value.splice(_this.message.start, _this.message.amount);
									updateCrm(true);
									_this.respondSuccess(spliced, safe(node).value);
								} else {
									node.linkVal = node.linkVal || [];
									spliced = node.linkVal.splice(_this.message.start, _this.message.amount);
									updateCrm(true);
									_this.respondSuccess(spliced, safe(node).linkVal);
								}
							}
						]);
					});

				});
			},
			linkForEach: function() {
				_this.checkPermissions(['crmGet'], ['crmWrite'], function(permitted) {
					_this.typeCheck([
						{
							val: 'process',
							type: 'function'
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							var i;
							if (node.type === 'link') {
								if (permitted.length === 1) {
									for (i = 0; i < node.value.length; i++) {
										_this.message.process(node.value.length[i], i);
									}
								} else {
									node.value.forEach(_this.message.process);
								}
								updateCrm(true);
								_this.respondSuccess(safe(node).value);
							} else {
								node.linkVal = node.linkVal || [];
								if (permitted.length === 1) {
									for (i = 0; i < node.value.length; i++) {
										_this.message.process(node.linkVal.length[i], i);
									}
								} else {
									node.linkVal.forEach(_this.message.process);
								}
								updateCrm(true);
								_this.respondSuccess(node.linkVal);
							}
							return true;
						});
					});
				});
			},
			setScriptLaunchMode: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'launchMode',
							type: 'number',
							min: 0,
							max: 3
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							if (node.type === 'script') {
								node.value.launchMode = _this.message.launchMode;
							} else {
								node.scriptVal = node.scriptVal || {};
								node.scriptVal.launchMode = _this.message.launchMode;
							}
							updateCrm();
							_this.respondSuccess(safe(node));
							return true;
						});
					});
				});
			},
			getScriptLaunchMode: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId).run(function(node) {
						if (node.type === 'script') {
							_this.respondSuccess(node.value.launchMode);
						} else {
							(node.scriptVal && _this.respondSuccess(node.scriptVal.launchMode)) || _this.respondSuccess(undefined);
						}
					});

				});
			},
			registerLibrary: function() {
				_this.checkPermissions(['registerLibrary'], function() {
					_this.typeCheck([
						{
							val: 'name',
							type: 'string'
						}, {
							val: 'url',
							type: 'string',
							optional: true
						}, {
							val: 'code',
							type: 'string',
							optional: true
						}
					], function(optionals) {
						window.chrome.storage.local.get('libraries', function(items) {
							var libraries = items.libraries;
							var newLibrary = {
								name: _this.message.name
							};
							if (optionals[1]) {
								if (_this.message.url.indexOf('.js') === _this.message.url.length - 3) {
									//Use URL
									var done = false;
									var xhr = new XMLHttpRequest();
									xhr.open('GET', _this.message.url, true);
									xhr.onreadystatechange = function() {
										if (xhr.readyState === 4 && xhr.status === 200) {
											done = true;
											newLibrary.code = xhr.responseText;
											newLibrary.url = _this.message.url;
											libraries.push(newLibrary);
											window.chrome.storage.local.set({
												libraries: libraries
											});
											_this.respondSuccess(newLibrary);
										}
									};
									setTimeout(function() {
										if (!done) {
											_this.respondError('Request timed out');
										}
									}, 5000);
									xhr.send();
								} else {
									_this.respondError('No valid URL given');
									return false;
								}
							} else if (optionals[2]) {
								newLibrary.code = _this.message.code;
								libraries.push(newLibrary);
								window.chrome.storage.local.set({
									libraries: libraries
								});
								_this.respondSuccess(newLibrary);
							} else {
								_this.respondError('No URL or code given');
								return false;
							}
							return true;
						});
					});
				});
			},
			scriptLibraryPush: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'libraries',
							type: 'object|array',
							forChildren: [
								{
									val: 'name',
									type: 'string'
								}
							]
						}, {
							val: 'libraries.name',
							type: 'string',
							optional: true
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function (node) {
							if (_this.message.libraries.length == undefined) { //Array
								for (var i = 0; i < _this.message.libraries.length; i++) {
									if (node.type === 'script') {
										node.value.libraries.push(_this.message.libraries);
									} else {
										node.scriptVal = node.scriptVal || {};
										node.scriptVal.libraries = node.scriptVal.libraries || [];
										node.scriptVal.libraries.push(_this.message.libraries);
									}
								}
							} else { //Object
								if (node.type === 'script') {
									node.value.libraries.push(_this.message.libraries);
								} else {
									node.scriptVal = node.scriptVal || {};
									node.scriptVal.libraries = node.scriptVal.libraries || [];
									node.scriptVal.libraries.push(_this.message.libraries);
								}
							}
							updateCrm(true);
							if (node.type === 'script') {
								_this.respondSuccess(safe(node).value.libraries);
							} else {
								_this.respondSuccess(node.scriptVal.libraries);
							}
							return true;
						});
					});
				});
			},
			scriptLibrarySplice: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'start',
							type: 'number'
						}, {
							val: 'amount',
							type: 'number'
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							var spliced;
							if (node.type === 'script') {
								spliced = safe(node).value.libraries.splice(_this.message.start, _this.message.amount);
								updateCrm(true);
								_this.respondSuccess(spliced, safe(node).value.libraries);
							} else {
								node.scriptVal = node.scriptVal || {};
								node.scriptVal.libraries = node.scriptVal.libraries || [];
								spliced = node.scriptVal.libraries.splice(_this.message.start, _this.message.amount);
								updateCrm(true);
								_this.respondSuccess(spliced, node.scriptVal.libraries);
							}
							return true;
						});
					});
				});
			},
			setScriptValue: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'script',
							type: 'string'
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							if (node.type === 'script') {
								node.value.script = script;
							} else {
								node.scriptVal = node.scriptVal || {};
								node.scriptVal.script = script;
							}
							updateCrm(true);
							_this.respondSuccess(safe(node));
							return true;
						});
					});
				});
			},
			getScriptValue: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId, true).run(function(node) {
						if (node.type === 'script') {
							_this.respondSuccess(node.value.script);
						} else {
							(node.scriptVal && _this.respondSuccess(node.scriptVal.script)) || _this.respondSuccess(undefined);
						}
					});

				});
			},
			getMenuChildren: function() {
				_this.checkPermissions(['crmGet'], function() {
					_this.getNodeFromId(_this.message.nodeId, true).run(function(node) {
						if (node.type === 'menu') {
							_this.respondSuccess(node.children);
						} else {
							_this.respondSuccess(node.menuVal);
						}
					});

				});
			},
			setMenuChildren: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'childrenIds',
							type: 'array'
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId, true).run(function(node) {
							var i;
							for (i = 0; i < _this.message.childrenIds.length; i++) {
								if (typeof _this.message.childrenIds[i] !== 'number') {
									_this.respondError('Not all values in array childrenIds are of type number');
									return false;
								}
							}
							var children = [];
							for (i = 0; i < _this.message.childrenIds.length; i++) {
								children.push(_this.getNodeFromId(_this.message.childrenIds[i], true, true));
							}
							if (node.type === 'menu') {
								node.children = children;
							} else {
								node.menuVal = children;
							}
							updateCrm();
							_this.respondSuccess(safe(node));
							return true;
						});
					});
				});
			},
			pushMenuChildren: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'childrenIds',
							type: 'array'
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							var i;
							for (i = 0; i < _this.message.childrenIds.length; i++) {
								if (typeof _this.message.childrenIds[i] !== 'number') {
									_this.respondError('Not all values in array childrenIds are of type number');
									return false;
								}
							}
							var children = [];
							for (i = 0; i < _this.message.childrenIds.length; i++) {
								children[i] = _this.getNodeFromId(_this.message.childrenIds[i], false, true);
							}
							if (node.type === 'menu') {
								node.children.push(children);
							} else {
								node.menuVal.push(children);
							}
							updateCrm();
							_this.respondSuccess(safe(node));
							return true;
						});
					});
				});
			},
			spliceMenuChildren: function() {
				_this.checkPermissions(['crmGet', 'crmWrite'], function() {
					_this.typeCheck([
						{
							val: 'start',
							type: 'number'
						}, {
							val: 'amount',
							type: 'number'
						}
					], function() {
						_this.getNodeFromId(_this.message.nodeId).run(function(node) {
							var spliced = (node.type === 'menu' ? node.children : node.menuVal).splice(_this.message.start, _this.message.amount);
							updateCrm();
							_this.respondSuccess(spliced, (node.type === 'menu' ? safe(node).children : safe(node).menuVal));
							return true;
						});
					});
				});
			}
		};

		this.crmFunctions[this.toRun] && this.crmFunctions[this.toRun]();
	}

	function crmHandler(message) {
		crmFunction(message, message.action);
	}

	function chromeHandler(message, respond) {
		var node = crmById[message.id];
		var apiPermission = message.api.split(',').split('.')[0];
		var chromeFound = (node.permissions.indexOf('chrome') > 1);
		var apiFound = (node.permissions.indexOf(apiPermission) > 1);
		if (!chromeFound && !apiFound) {
			respond({
				error: 'Both permissions chrome and ' + apiPermission + ' not available to this script'
			});
		} else if (!chromeFound) {
			respond({
				error: 'Permission chrome not available to this script'
			});
		} else if (!apiFound) {
			respond({
				error: 'Permission ' + apiPermission + ' not avilable to this script'
			});
		} else {
			//Check permissions
			var api = message.api;
			api = api.split(',')[0];

			var params = '';
			var allowedPermissions = (node.isLocal ? '*' : node.permissions || []);
			if (permissions.indexOf(api) > -1) {
				if (allowedPermissions === '*' || allowedPermissions.indexOf(api) > -1) {
					if (availablePermissions.indexOf(api) > -1) {
						for (var i = 0; i < message.args - 1; i++) {
							params.push(message.args[i] + ', ');
						}
						params.push(message.args[message.args.length - 1]);
						try {
							var result = sandbox('result = chrome.' + message.api + '(' + params + ')');
							if (message.onFinish) {
								message.onFinish(result);
							}
						} catch (e) {
							respond({
								error: e
							});
						}
					} else {
						respond({
							error: 'Permissions ' + api + ' not available to the extension, visit options page'
						});
						window.chrome.storage.sync.get('requestPermissions', function(keys) {
							var perms = keys.requestPermissions || [api];
							window.chrome.storage.sync.set({
								requestPermissions: perms
							});
						});
					}
				} else {
					respond({
						error: 'Permission ' + api + ' not requested'
					});
				}
			} else {
				respond({
					error: 'Permissions ' + api + ' is not available for use'
				});
			}
		}
	}

	function pingHandler(message, messageSender) {
		secretKeys[messageSender.tab.id][message.id].alive = true;
	}

	function checkAlive() {
		var tab;
		var script;
		var children;
		for (tab in secretKeys) {
			if (secretKeys.hasOwnProperty(tab)) {
				children = 0;
				for (script in secretKeys[tab]) {
					if (tab.hasOwnProperty(secretKeys[tab][script])) {
						children++;
						if (secretKeys[tab][script].alive === undefined) {
							//Still setting up for the first ping, give it a second
							secretKeys[tab][script].alive = false;
						} else if (secretKeys[tab][script].alive === false) {
							delete keys[secretKeys[tab][script].secretKey];
							delete secretKeys[tab][script];
						}
					}
				}
				if (children === 0) {
					//Delete empty tabs
					delete secretKeys[tab];
				}
			}
		}
	}

	window.setInterval(checkAlive, 30000);

	/*#endregion*/

	function handleMessage(message, messageSender, respond) {
		var result = window.de(message.msg, secretKeys[messageSender.tab.id][message.id].secretKey);
		if (result !== false) {
			message = result;

			switch (message.type) {
				case 'updateStorage':
					updateNodeStorage(message);
					break;
				case 'crm':
					crmHandler(message);
					break;
				case 'chrome':
					chromeHandler(message, respond);
					break;
				case 'ping':
					pingHandler(message, messageSender);
					break;
			}
		}
		//Fail silently
	}

	function main() {
		window.chrome.storage.sync.get(function(data) {
			storageSync = data;
			window.chrome.storage.local.get(function(locals) {
				storageLocal = locals;
				crmTree = data.crm;
				safeTree = buildSafeTree(data.crm);
				buildByIdObjects(data.crm);
				var bgPageUrl = window.chrome.runtime.getURL('_generated_background_page.html');
				window.chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
					if (bgPageUrl !== sender.url) { //Don't talk to yourself
						handleMessage(message, sendResponse);
					}
				});
				buildPageCRM();
			});
		});
	}

	window.chrome.permissions.getAll(function(available) {
		availablePermissions = available.permissions;
		main();
	});
};

mainContainer();
var rpcUri = 'http://127.0.0.1:6800/jsonrpc';
var autorefresh = 5000;

function StatusCtrl ($scope, $http, $timeout) {
	var request = {"jsonrpc":"2.0","method":"aria2.getGlobalStat","id":1};
	$scope.status = null;
	$scope.humanReadable = bytesToSize;
	$scope.cancel = null;

	// Auto update routine
	$scope.refresh = function () {
    	$http.post(rpcUri, request).success(function(data) {
			$scope.status = data.result;
		});
    };

    $scope.autorefresh = function () {
    	$scope.cancel = $timeout($scope.autorefresh, autorefresh);
    	$scope.refresh();
    }

    $scope.autorefresh();
}

function TaskCtrl ($scope, $http, $timeout) {
	var request = [];

	$scope.tasks = [];
	$scope.selected = null;

	$scope.countActive = 0;
	$scope.countNotActive = 0;

	var cancel = null;

	$scope.init = function(status) {
		request.push({"jsonrpc":"2.0","id":1,"method":"aria2.tellActive"});
		request.push({"jsonrpc":"2.0","id":1,"method":"aria2.tellStopped",
			"params":[0,1000]});
		request.push({"jsonrpc":"2.0","id":1,"method":"aria2.tellWaiting",
			"params":[0,1000]});

		$scope.refresh();
	};

	$scope.refresh = function () {
		$http.post(rpcUri, request).success(function(data) {
			$scope.tasks = [].concat(data[0].result);
			$scope.tasks = $scope.tasks.concat(data[1].result);
			$scope.tasks = $scope.tasks.concat(data[2].result);
			$scope.countActive = $scope.countNotActive = 0;
			for (i = 0; i < $scope.tasks.length; i++) {
				if ($scope.tasks[i].status == 'active')
					$scope.countActive++;
				else
					$scope.countNotActive++;
			};
		});
	};

	$scope.autorefresh = function () {
		cancel = $timeout($scope.autorefresh, autorefresh);
		$scope.refresh();
	};

	$scope.stoprefresh = function () {
		$timeout.cancel(cancel);
	}

	// Main command
	$scope._execute = function(method, params) {

		if (params == null)
			params = [];

		var request = {
			"jsonrpc":"2.0",
			"method":"aria2." + method,
			"id":1,
			"params": params};

		$http.post(rpcUri, request).success(function(data) {
			if (data.result == "OK")
				console.log("Command OK");
		});
	};

	$scope.humanReadable = bytesToSize;

	$scope.remove = function(gid) {
		$scope._execute("remove", [gid]);
	}

	$scope.unpause = function(gid) {
		$scope._execute("unpause", [gid]);
	}

	$scope.pause = function(gid) {
		$scope._execute("pause", [gid]);
	}

	$scope.pauseAll = function() {
		$scope._execute("pauseAll");
	};

	$scope.unpauseAll = function() {
		$scope._execute("unpauseAll");
	};

	$scope.removeFinished = function() {
		$scope._execute("purgeDownloadResult");	
	};

	$scope.isSelected = function(task) {
		return ($scope.selected == task.gid);
	}

	$scope.select = function(task) {
		if ($scope.selected == task.gid)
			$scope.selected = null;
		else
			$scope.selected = task.gid;
	};

	$scope.extractName = function (task) {
		var title = "Unknown";
		// Check if its a bit torrent task
		if (task.bittorrent && task.bittorrent.info && task.bittorrent.info.name)
			title = task.bittorrent.info.name;
		// Try to get the filename
		else if ($scope.fileFromPath(task.files[0].path))
			title = $scope.fileFromPath(task.files[0].path)
		// Just use the first url as name
		else if (task.files.length && task.files[0].uris.length && task.files[0].uris[0].uri)
			title = task.files[0].uris[0].uri;

		return title;
	};

	$scope.progress = function(task) {
		return (task.completedLength / task.totalLength * 100).toFixed(2);
	};

	$scope.progressFile = function(task) {
		return (task.completedLength / task.length * 100).toFixed(2);
	};

	$scope.progressColor = function(task) {
		var h = Math.round($scope.progress(model) / 100 * 120);
		var r = hsvToRgb(h,90,70);
		return "rgb(" + r[0] + "," + r[1] + "," + r[2] + ")";
	}

	$scope.isActive = function (task) {
		return (task.status == 'active');
	};

	$scope.isNotActive = function (task) {
		return (task.status != 'active');
	};

	$scope.etc = function(task) {
		return numeral(Math.round((task.totalLength - task.completedLength) /
			task.downloadSpeed)).format('00:00:00');
	};

	$scope.ratio = function(model) {
		return (task.uploadLength / task.completedLength).toFixed(2);
	}

	$scope.fileFromPath = function(path) {
		return path.replace(/^.*[\\\/]/, '');
	};

	// Let's start it all.
	$scope.init();
};

// Misc functions
function bytesToSize(bytes, speed) {
	var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	if (bytes == 0)
		return '0';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	var s = (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
	
	if (speed)
		s += "/s";

	return s;
};

function hsvToRgb(h,s,v) {  
  
    var s = s / 100,  
         v = v / 100;  
  
    var hi = Math.floor((h/60) % 6);  
    var f = (h / 60) - hi;  
    var p = v * (1 - s);  
    var q = v * (1 - f * s);  
    var t = v * (1 - (1 - f) * s);  
  
    var rgb = [];  
  
    switch (hi) {  
        case 0: rgb = [v,t,p];break;  
        case 1: rgb = [q,v,p];break;  
        case 2: rgb = [p,v,t];break;  
        case 3: rgb = [p,q,v];break;  
        case 4: rgb = [t,p,v];break;  
        case 5: rgb = [v,p,q];break;  
    }  
  
    var r = Math.min(255, Math.round(rgb[0]*256)),  
        g = Math.min(255, Math.round(rgb[1]*256)),  
        b = Math.min(255, Math.round(rgb[2]*256));  
  
    return [r,g,b];
}     
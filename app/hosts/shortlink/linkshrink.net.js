var Account = require('../../models/account'),
	hostEnum = require('../../helper/host'),
	request = require('request'),
	_ = require('lodash'),
	async = require('async'),
    S = require('string'),
    querystring = require('querystring'),
	helper = require('../../helper/helper')

var re = /https?:\/\/linkshrink\.net\/.+/
var result = {}

module.exports.getLink = function(link, callback) {

	var match = re.exec(link)
	if (match === null)
		return callback(new Error('Đường link không hợp lệ'))

	// Default value
	result.url = link
	result.uid = 0
	result.host = hostEnum.LINKSHRINK
	result.type = 'shortlink'

	async.waterfall([
		function(callback) {
			skip(callback)
		},
        function(callback) {
            skip2(callback)
        },
		function(callback) {
			helper.checkSafeUrl(result.direct_link, function(err, safe) {
				if (err)
					return callback(err)

				result.safe = safe
				callback(null, result)
			})
		}
	],
		callback
	)
}

var skip = function(callback) {
	var options = {
		uri: result.url,
		method: 'GET',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: false
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        if (response.statusCode !== 200)
            return callback(new Error('Gián đoạn. Thử lại'))

        if (_.includes(body, 'does not exist'))
			return callback(new Error('Đường dẫn ko tồn tại'))

        result.skip_link = 'https:' + S(body).between('bt\' href=\'http:', '\'').s
        if (!result.skip_link)
            return callback(new Error('Lỗi bất thường'))

        callback(null)
	})
}

var skip2 = function(callback) {
    var options = {
		uri: result.skip_link,
		method: 'HEAD',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36",
            "Cookie": "s32=1"
		},
		jar: true,
        followRedirect: false
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        if (response.statusCode !== 301 && response.statusCode !== 302)
            return callback(new Error('Gián đoạn. Thử lại'))

        var direct_link = response.headers['location']

        getTitle(direct_link, function(err, title) {
            if (err)
                title = 'LINKSHRINK.NET'

            result.file = {
    			name: title
    		}
            result.direct_link = direct_link

    		callback(null)
        })
    })
}

var getTitle = function(url, callback) {
	var options = {
		uri: url,
		method: 'HEAD',
		headers: {
    		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.60 Safari/537.36"
		},
		jar: true,
        followRedirect: true
	}

	request(options, function (error, response, body) {
		if (error)
            return callback(error)

        if (!_.includes(response.headers['content-type'], 'text/html'))
            return callback(new Error('Không thể lấy Tittle'))

        options.method = 'GET'
        request(options, function (error, response, body) {
            if (error)
                return callback(error)

            var title = S(body).between('<title>', '</title>').s
            if (!title)
                return callback(new Error('Không thể lấy Tittle'))

            callback(null, title)
        })
	})
}

import os, json, requests
from bs4 import BeautifulSoup
from urllib import parse

def makePageUrl(page :int) -> str:
	# 2638 pages in total / 2021-8-19
	url = 'http://konachan.zju.link/'
	if page == 1:
		return url
	else:
		return url + 'index.php?tag=&p=' + str(page)

def getRecordsByPage(page :int):
	url = makePageUrl(page)
	resp = requests.get(url, timeout=5)
	if resp.status_code != 200:
		return None
	else:
		soup = BeautifulSoup(resp.text, 'html.parser')
		temp = soup.select('button.am-btn.am-btn-secondary.am-btn-xs')
		rurls =  [e['onclick'].split('\'')[1] for e in temp]
		results = []
		for rurl in rurls:
			durl = parse.unquote(rurl)
			temp = durl.split(' ')[2:]
			pdot = temp[-1].rfind('.')
			uid = durl.split('/')[4]
			rid = temp[0]
			suffix = temp[-1][pdot + 1:]
			tags = temp[1:]
			tags[-1] = tags[-1][:pdot]
			results.append({'uid': uid, 'id': rid, 'format': suffix, 'tags': tags})
		return results

def updateRecords() -> int:
	fndb = 'konachan.db.txt'
	f = open(fndb, 'r+')
	firstRecID = int(json.loads(f.readline().strip())['id'])
	newRecords = []
	i = 1
	while True:
		results = getRecordsByPage(i)
		j = 0
		while j < len(results):
			if int(results[j]['id']) <= firstRecID:
				newRecords.extend(results[:j])
				break
			j += 1
		if j == len(results):
			newRecords.extend(results)
		else:
			break
		i += 1
	f.seek(0, 0)
	content = f.read()
	jir = '\n'.join([json.dumps(e) for e in newRecords]) + '\n'
	f.seek(0, 0)
	f.write((jir + content).strip())
	f.flush()
	os.fsync(f)
	return len(newRecords)

def getOriginImage(desc: dict):
	url = 'https://konachan.net/image/%s/Konachan.com - %s %s.%s'
	url = url%(desc['uid'], desc['id'], ' '.join(desc['tags']), desc['format'])
	resp = requests.get(url)
	if resp.status_code != 200 and resp.status_code != 304:
		return None
	else:
		return resp.content

def getSample(desc: dict):
	url = 'https://konachan.net/sample/%s/Konachan.com - %s sample.jpg'
	url = url%(desc['uid'], desc['id'])
	resp = requests.get(url)
	if resp.status_code == 200 or resp.status_code == 304:
		return resp.content
	url = 'https://konachan.net/jpeg/%s/Konachan.com - %s %s.jpg'
	url = url%(desc['uid'], desc['id'], ' '.join(desc['tags']))
	resp = requests.get(url)
	if resp.status_code == 200 or resp.status_code == 304:
		return resp.content
	return None

def getPreview(desc: dict):
	url = 'https://konachan.net/data/preview/%s/%s/%s.jpg'
	url = url%(desc['uid'][0:2], desc['uid'][2:4], desc['uid'])
	resp = requests.get(url)
	if resp.status_code != 200 and resp.status_code != 304:
		return None
	else:
		return resp.content

if __name__ == '__main__':
	if os.path.exists('konachan.db.txt'):
		print('[NOTE] konochan: update local database.')
		count = updateRecords()
		print('[NOTE] konochan: updated %d in total.'%(count))
	else:
		import threading, time, sqlite3

		N = 0
		lock = threading.RLock()

		ImageRecords = []

		def collect():
			global N, lock, ImageRecords

			tid = threading.currentThread().ident
			bQuit = False

			while True:
				lock.acquire()
				N += 1
				cid = N
				if N > 2638:
					bQuit = True
				lock.release()

				if bQuit:
					break

				while True:
					try:
						results = getRecordsByPage(cid)
						break
					except (requests.ConnectionError, requests.ConnectTimeout, requests.ReadTimeout) as e:
						print('[%s] konachan(%d): failed get target page %d.'
							%(e.__class__.__name__, tid, cid))
						time.sleep(8)
					except Exception as e:
						print('[%s] konachan(%d): unexpected error occurred when getting target page %d.'
							%(e.__class__.__name__, tid, cid))

				lock.acquire()
				if results != None:
					ImageRecords.extend(results)
					print('[NOTE] konachan(%d): page %d done.'%(tid, cid))
				else:
					print('[NOTE] konachan(%d): page %d failed.'%(tid, cid))
				if len(ImageRecords) > 50000:
					jir = '\n'.join([json.dumps(e) for e in ImageRecords]) + '\n'
					with open('konachan.db.txt', 'a') as f:
						f.write(jir)
						f.flush()
						os.fsync(f)
					del ImageRecords[:]
				lock.release()

			lock.acquire()
			if len(ImageRecords) != 0:
				jir = '\n'.join([json.dumps(e) for e in ImageRecords]) + '\n'
				with open('konachan.db.txt', 'a') as f:
					f.write(jir)
					f.flush()
					os.fsync(f)
				del ImageRecords[:]
			lock.release()

			print('[NOTE] konachan(%d): thread exited.'%(tid))

		for i in range(16):
			t = threading.Thread(target=collect)
			t.start()

		while threading.active_count() != 1:
			pass

		print('[NOTE] konachan: 2638 pages done.')
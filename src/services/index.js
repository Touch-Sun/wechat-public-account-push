
import axios from 'axios'
import dayjs from 'dayjs'
import { Lunar } from 'lunar-javascript'
import { JSDOM } from 'jsdom'

import { config } from '../../config/index.js'
import { CITY_INFO, DEFAULT_OUTPUT, TYPE_LIST } from '../store/index.js'
import {
  getConstellation,
  randomNum,
  sortBirthdayTime,
  getColor,
  toLowerLine
 } from '../utils/index.js'
import { selfDayjs, timeZone } from '../utils/set-def-dayjs.js'

axios.defaults.timeout = 10000

/**
 * 获取 accessToken
 * @returns accessToken
 */
export const getAccessToken = async () => {
  // APP_ID
  const appId = config.APP_ID || process.env.APP_ID
  // APP_SECRET
  const appSecret = config.APP_SECRET || process.env.APP_SECRET
  // accessToken
  let accessToken = null

  // 打印日志
  if (!appId) {
    console.log('未填写appId!! 请检查是否actions secret的变量拼写正确，仔细阅读文档!!', appId)
    return null
  }
  if (!appSecret) {
    console.log('未填写appSecret!! 请检查是否actions secret的变量拼写正确，请仔细阅读文档!!', appId)
    return null
  }

  console.log('已获取appId', appId)
  console.log('已获取appSecret', appSecret)


  const postUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${ appId }&secret=${ appSecret }`

  try {
    const res = await axios.get(postUrl).catch(err => err)
    if (res.status === 200 && res.data && res.data.access_token) {
      accessToken = res.data.access_token
      console.log('---')
      console.log('获取 accessToken: 成功', res.data)
      console.log('---')
    } else {
      console.log('---')
      console.error('获取 accessToken: 请求失败', res.data.errmsg)
      console.log('---')
      console.log(`40001: 请检查appId，appSecret 填写是否正确；
                  如果第一次使用微信测试号请关闭测试号平台后重新扫码登陆测试号平台获取最新的appId，appSecret`)
    }
  } catch (e) {
    console.error('获取 accessToken: ', e)
  }

  return accessToken
}

/**
 * 获取天气情况
 * @param {*} province 省份
 * @param {*} city 城市
 */
export const getWeather = async (province, city) => {
  if (!CITY_INFO[province] || !CITY_INFO[province][city] || !CITY_INFO[province][city]['AREAID']) {
    console.error('配置文件中找不到相应的省份或城市')
    return {}
  }
  const address = CITY_INFO[province][city]['AREAID']

  const url = `http://d1.weather.com.cn/dingzhi/${ address }.html?_=${ selfDayjs().valueOf() }`

  const res = await axios.get(url, {
    headers: {
      'Referer': `http://www.weather.com.cn/weather1d/${ address }.shtml`,
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36`
    }
  }).catch(err => err)

  try {
    if (res.status === 200 && res.data) {
      const temp = res.data.split(';')[0].split('=')
      const weatherStr = temp[temp.length - 1]
      const weather = JSON.parse(weatherStr)
      if (weather.weatherinfo) {
        return weather.weatherinfo
      }
      console.error('天气情况: 找不到weatherinfo属性, 获取失败')
      return {}
    }
    console.error('天气情况获取失败', res)
    return {}
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error('天气情况: 序列化错误', e)
    } else {
      console.error('天气情况: ', e)
    }
    return {}
  }
}

/**
 * 金山词霸每日一句
 * @returns
 */
export const getCIBA = async () => {
  const url = 'http://open.iciba.com/dsapi/'
  const res = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
    }
  }).catch(err => err)

  if (res.status === 200 && res) {
    return res.data
  }
  console.error('金山词霸每日一句: 发生错误', res)
  return {}
}

/**
 * 每日一言
 * @param {*} type
 * @returns
 */
export const getOneTalk = async (type) => {

  const filterQuery = TYPE_LIST.filter(item => item.name === type)
  const query = filterQuery.length ? filterQuery[0].type : TYPE_LIST[randomNum(0, 7)].type
  const url = `https://v1.hitokoto.cn/?c=${ query }`

  const res = await axios.get(url).catch(err => err)

  if (res && res.status === 200) {
    return res.data
  }

  console.error('每日一言: 发生错误', res)
  return {}

}
/**
 * 从沙雕APP开放接口中获取数据
 * @param {'chp' | 'pyq' | 'du'} type
 * @returns {Promise<String>}
 */
export const getWordsFromApiShadiao = async (type) => {
  const typeNameMap = {
    chp: '土味情话(彩虹屁)',
    pyq: '朋友圈文案',
    du: '毒鸡汤'
  }
  if (!['chp', 'pyq', 'du'].includes(type)) {
    console.error('type参数有误，应为chp, pyq, du的其中一个')
    return ''
  }
  const url = `https://api.shadiao.pro/${ type }`
  try {
    const res = await axios.get(url, {
      responseType: 'json'
    }).catch(err => err)
    return res.data && res.data.data && res.data.data.text || ''
  } catch (e) {
    console.error(`${ typeNameMap[type] }：发生错误`, e)
    return ''
  }
}

/**
 * 土味情话（彩虹屁）
 * @returns {Promise<String>} 土味情话(彩虹屁）内容
 */
export const getEarthyLoveWords = async () => {
  return await getWordsFromApiShadiao('chp')
}

/**
 * 朋友圈文案
 * @returns {Promise<String>} 朋友圈文案内容
 */
export const getMomentCopyrighting = async () => {
  return await getWordsFromApiShadiao('pyq')
}

/**
 * 毒鸡汤
 * @returns {Promise<String>} 毒鸡汤内容
 */
export const getPoisonChickenSoup = async () => {
  return await getWordsFromApiShadiao('du')
}
/**
 * 古诗古文
 * @returns {Promise<{}|{dynasty: string, author: string, title: string, content: string}>} 古诗内容 标题 作者 朝代
 */
export const getPoetry = async () => {
  const url = 'https://v2.jinrishici.com/sentence'
  try {
    const res = await axios.get(url, {
      headers: {
        'X-User-Token': 'FW8KNlfULPtZ9Ci6aNy8aTfPJPwI+/Ln'
      },
      responseType: 'json'
    }).catch(err => err)
    const { status, data, warning } = res.data || {}
    if (status !== 'success') {
      console.error('古诗古文：发生错误', warning || '')
      return {}
    }
    const { content = '', origin } = data || {}
    const { title = '', author = '', dynasty = '' } = origin || {}
    return {
      content,
      title,
      author,
      dynasty
    }
  } catch (e) {
    console.error('古诗古文：发生错误', e)
    return {}
  }
}

/**
 * 获取重要节日信息
 * @param {Array<object>} festivals
 * @return
 */
export const getBirthdayMessage = (festivals) => {
  // 计算重要节日倒数
  const birthdayList = sortBirthdayTime((festivals || config.FESTIVALS || []).map((it) => {
    let { type, year, date } = it
    const useLunar = /^\*/.test(type)
    if (!useLunar) {
      return it
    }
    type = type.replace(/^\*/, '')
    const [month, day] = date.split('-').map(Number)
    // 获取今年的生日信息
    const lunarInThisYear = Lunar.fromYmd((new Date).getFullYear(), month, day)
    const solarInThisYear = lunarInThisYear.getSolar()
    const lunar = Lunar.fromYmd(Number(year), month, day)
    const solar = lunar.getSolar()
    return {
      ...it,
      useLunar,
      type,
      year,
      date,
      solarDate: `${ solar.getMonth() }-${ solar.getDay() }`,
      solarDateInThisYear: `${ solarInThisYear.getMonth() }-${ solarInThisYear.getDay() }`
    }
  }))
  let resMessage = ''

  birthdayList.forEach((item, index) => {
    if (
      !config.FESTIVALS_LIMIT ||
      (config.FESTIVALS_LIMIT && index < config.FESTIVALS_LIMIT)
    ) {
      let message = null

      // 生日相关
      if (item.type === '生日') {
        // 获取周岁
        const age = selfDayjs().diff(item.year + '-' + (item.useLunar ? item.solarDateInThisYear : item.date), 'year')

        if (item.diffDay === 0) {
          message = `今天是 ${ item.name } 的${ age ? age + '岁' : '' }生日哦，祝${ item.name }生日快乐！`
        } else {
          message = `距离 ${ item.name } 的${ age ? age + 1 + '岁' : '' }生日还有${ item.diffDay }天`
        }
      }

      // 节日相关
      if (item.type === '节日') {
        if (item.diffDay === 0) {
          message = `今天是 ${ item.name } 哦，要开心！`
        } else {
          message = `距离 ${ item.name } 还有${ item.diffDay }天`
        }
      }

      // 存储数据
      if (message) {
        resMessage += `${ message } \n`
      }

    }

  })

  return resMessage
}

/**
 * 计算每个重要日子的日期差
 * @params {*} customizedDateList
 * @returns
 */
export const getDateDiffList = (customizedDateList) => {
  if (Object.prototype.toString.call(customizedDateList) !== '[object Array]'
  && Object.prototype.toString.call(config.CUSTOMIZED_DATE_LIST) !== '[object Array]') {
    return []
  }
  const dateList = customizedDateList || config.CUSTOMIZED_DATE_LIST

  dateList.forEach(item => {
    item['diffDay'] = Math.ceil(selfDayjs().diff(selfDayjs(item.date), 'day', true))
    if (item['diffDay'] <= 0) {
      item['diffDay'] = Math.abs(Math.floor(selfDayjs().diff(selfDayjs(item.date), 'day', true)))
    }
  })

  return dateList
}

/**
 * 自定义插槽信息
 * @returns
 */
export const getSlotList = () => {
  if (Object.prototype.toString.call(config.SLOT_LIST) !== '[object Array]') {
    return []
  }
  const slotList = config.SLOT_LIST

  slotList.forEach(item => {
    if (Object.prototype.toString.call(item.contents) === '[object Array]' && item.contents.length > 0) {
      item['checkout'] = item.contents[Math.floor(Math.random() * item.contents.length + 1) - 1]
    } else if (Object.prototype.toString.call(item.contents) === '[object String]') {
      item['checkout'] = item.contents
    } else {
      item['checkout'] = ''
    }
  })

  return slotList
}

/**
 * 发送消息模板
 * @param {*} templateId
 * @param {*} user
 * @param {*} accessToken
 * @param {*} params
 * @returns
 */
export const sendMessage = async (templateId, user, accessToken, params) => {
  const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${ accessToken }`

  const wxTemplateData = {}
  if (Object.prototype.toString.call(params) === '[object Array]') {
    params.map(item => {
      wxTemplateData[item.name] = {
        value: item.value,
        color: item.color
      }
    })
  }


  // 组装数据
  const data = {
    'touser': user.id,
    'template_id': templateId,
    'url': user.openUrl || 'https://wangxinleo.cn',
    'topcolor': '#FF0000',
    'data': wxTemplateData
  }

  // 发送消息
  const res = await axios.post(url, data, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
    }
  }).catch(err => err)


  if (res.data && res.data.errcode === 0) {
    console.log(`${ user.name }: 推送消息成功`)
    return {
      name: user.name,
      success: true
    }
  }

  if (res.data && res.data.errcode === 40003) {
    console.error(`${ user.name }: 推送消息失败! id填写不正确！应该填用户扫码后生成的id！要么就是填错了！请检查配置文件！`)
  } else if (res.data && res.data.errcode === 40036) {
    console.error(`${ user.name }: 推送消息失败! 模板id填写不正确！应该填模板id！要么就是填错了！请检查配置文件！`)
  } else {
    console.error(`${ user.name }: 推送消息失败`, res.data)
  }
  return {
    name: user.name,
    success: false
  }
}

/**
 * 推送消息, 进行成功失败统计
 * @param {*} users
 * @param {*} accessToken
 * @param {*} templateId
 * @param {*} params
 * @returns
 */
export const sendMessageReply = async (users, accessToken, templateId = null, params = null) => {
  const allPromise = []
  const needPostNum = users.length
  let successPostNum = 0
  let failPostNum = 0
  const successPostIds = []
  const failPostIds = []
  for (const user of users) {
    allPromise.push(sendMessage(
      templateId || user.useTemplateId,
      user,
      accessToken,
      params || user.wxTemplateParams
    ))
  }
  const resList = await Promise.all(allPromise);
  resList.forEach(item => {
    if (item.success) {
      successPostNum++
      successPostIds.push(item.name)
    } else {
      failPostNum++
      failPostIds.push(item.name)
    }
  })

  return {
    needPostNum,
    successPostNum,
    failPostNum,
    successPostIds: successPostIds.length ? successPostIds.join(',') : '无',
    failPostIds: failPostIds.length ? failPostIds.join(',') : '无'
  }
}

/**
 * 星座运势请求
 * @param {string} date
 * @param {string} dateType
 * @returns
 */
export async function getConstellationFortune(date, dateType) {
  const res = []
  if (!date) {
    return res
  }

  const periods = ['今日', '明日', '本周', '本月', '今年']
  const defaultType = [{
    name: '综合运势',
    key: 'comprehensiveHoroscope'
  }, {
    name: '爱情运势',
    key: 'loveHoroscope'
  }, {
    name: '事业学业',
    key: 'careerHoroscope'
  }, {
    name: '财富运势',
    key: 'wealthHoroscope'
  }, {
    name: '健康运势',
    key: 'healthyHoroscope'
  }]

  // 未填写时段，则取随机
  if (!dateType) {
    dateType = periods[Math.floor(Math.random() * periods.length + 1) - 1]
  }

  const dateTypeIndex = periods.indexOf(dateType);
  if (dateTypeIndex === -1) {
    console.error('星座日期类型horoscopeDateType错误, 请确认是否按要求填写!')
    return res
  }

  // 获取星座id
  const { en: constellation } = getConstellation(date)
  const url = `https://www.xzw.com/fortune/${constellation}/${dateTypeIndex}.html`
  try {
    const { data } = await axios.get(url).catch(err => err)
    if (data) {
      const jsdom = new JSDOM(data);
      defaultType.map((item, index) => {
        let value = jsdom.window.document.querySelector(`.c_cont p strong.p${ index + 1 }`).nextElementSibling.innerHTML.replace(/<small.*/, '');
        if (!value) {
          value = DEFAULT_OUTPUT.constellationFortune;
          console.error(item.name + '获取失败');
        }
        res.push({
          name: toLowerLine(item.key),
          value: `${dateType}${item.name}: ${value}`,
          color: getColor()
        })
      })
    } else {
      // 拿不到数据则拼假数据, 保证运行
      defaultType.map((item) => {
        const value = DEFAULT_OUTPUT.constellationFortune;
        res.push({
          name: toLowerLine(item.key),
          value: `${dateType}${item.name}: ${value}`,
          color: getColor()
        })
      })
    }

    return res
  } catch (e) {
    console.error('星座运势：发生错误', e)
    return res
  }
}

/**
 * 获取处理好的用户数据
 * @returns
 */
// istanbul ignore next
export const getAggregatedData = async () => {

  const weekList = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
  // 获取金山词霸每日一句
  const {
    content: noteEn = DEFAULT_OUTPUT.noteEn,
    note: noteCh = DEFAULT_OUTPUT.noteCh
  } = await getCIBA()
  // 获取每日一言
  const {
    hitokoto: oneTalk = DEFAULT_OUTPUT.oneTalk,
    from: talkFrom = DEFAULT_OUTPUT.talkFrom
  } = await getOneTalk(config.LITERARY_PREFERENCE)
  // 获取土味情话
  const earthyLoveWords = await getEarthyLoveWords() || DEFAULT_OUTPUT.earthyLoveWords
  // 获取朋友圈文案
  const momentCopyrighting = await getMomentCopyrighting() || DEFAULT_OUTPUT.momentCopyrighting
  // 获取毒鸡汤
  const poisonChickenSoup = await getPoisonChickenSoup() || DEFAULT_OUTPUT.poisonChickenSoup
  // 获取古诗古文 poetry
  const {
    dynasty: poetryDynasty = DEFAULT_OUTPUT.poetryDynasty,
    author: poetryAuthor = DEFAULT_OUTPUT.poetryAuthor,
    title: poetryTitle = DEFAULT_OUTPUT.poetryTitle,
    content: poetryContent = DEFAULT_OUTPUT.poetryContent,
  } = await getPoetry()
  // 获取插槽中的数据
  const slotParams = getSlotList().map(item => {
    return { name: item.keyword, value: item.checkout, color: getColor() }
  })


  if (Object.prototype.toString.call(config.USERS) !== '[object Array]') {
    console.error('配置文件中找不到USERS数组')
    throw new Error('配置文件中找不到USERS数组')
  }
  const users = config.USERS
  for (const user of users) {

    // 获取每日天气
    const {
      // 天气
      weather = DEFAULT_OUTPUT.weather,
      // 最高温度
      temp: maxTemperature = DEFAULT_OUTPUT.maxTemperature,
      // 最低温度
      tempn: minTemperature = DEFAULT_OUTPUT.minTemperature,
      // 风向
      wd: windDirection = DEFAULT_OUTPUT.windDirection,
      // 风力等级
      ws: windScale = DEFAULT_OUTPUT.windScale
    } = await getWeather(user.province || config.PROVINCE, user.city || config.CITY)

    // 统计日列表计算日期差
    const dateDiffParams = getDateDiffList(user.customizedDateList).map(item => {
      return { name: item.keyword, value: item.diffDay, color: getColor() }
    })

    // 获取生日/生日信息
    const birthdayMessage = getBirthdayMessage(user.festivals)

    // 获取星座运势
    const constellationFortune = await getConstellationFortune(user.horoscopeDate, user.horoscopeDateType)

    // 集成所需信息
    const wxTemplateParams = [
      { name: toLowerLine('toName'), value: user.name, color: getColor() },
      { name: toLowerLine('date'), value: `${selfDayjs().format('YYYY-MM-DD')} ${weekList[selfDayjs().format('d')]}`, color: getColor() },
      { name: toLowerLine('province'), value: user.province || config.PROVINCE, color: getColor() },
      { name: toLowerLine('city'), value: user.city || config.CITY, color: getColor() },
      { name: toLowerLine('slee'), value: user.score_lee },
      { name: toLowerLine('swillow'), value: user.score_willow },
      { name: toLowerLine('weather'), value: weather, color: getColor() },
      { name: toLowerLine('minTemperature'), value: minTemperature, color: getColor() },
      { name: toLowerLine('maxTemperature'), value: maxTemperature, color: getColor() },
      { name: toLowerLine('windDirection'), value: windDirection, color: getColor() },
      { name: toLowerLine('windScale'), value: windScale, color: getColor() },
      { name: toLowerLine('birthdayMessage'), value: birthdayMessage, color: getColor() },
      { name: toLowerLine('noteEn'), value: noteEn, color: getColor() },
      { name: toLowerLine('noteCh'), value: noteCh, color: getColor() },
      { name: toLowerLine('oneTalk'), value: oneTalk, color: getColor() },
      { name: toLowerLine('talkFrom'), value: talkFrom, color: getColor() },
      { name: toLowerLine('earthyLoveWords'), value: earthyLoveWords, color: getColor() },
      { name: toLowerLine('momentCopyrighting'), value: momentCopyrighting, color: getColor() },
      { name: toLowerLine('poisonChickenSoup'), value: poisonChickenSoup, color: getColor() },
      { name: toLowerLine('poetryContent'), value: poetryContent, color: getColor() },
      { name: toLowerLine('poetryAuthor'), value: poetryAuthor, color: getColor() },
      { name: toLowerLine('poetryDynasty'), value: poetryDynasty, color: getColor() },
      { name: toLowerLine('poetryTitle'), value: poetryTitle, color: getColor() },
    ].concat(constellationFortune)
    .concat(dateDiffParams)
    .concat(slotParams)

    user['wxTemplateParams'] = wxTemplateParams
  }

  return users
}

/**
 * 获取处理好的回执消息
 * @param {*} messageReply
 * @returns
 */
// istanbul ignore next
export const getCallbackTemplateParams = (messageReply) => {
  const postTimeZone = timeZone()
  const postTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return [
    { name: toLowerLine('postTimeZone'), value: postTimeZone, color: getColor() },
    { name: toLowerLine('postTime'), value: postTime, color: getColor() },
    { name: toLowerLine('needPostNum'), value: messageReply.needPostNum, color: getColor() },
    { name: toLowerLine('successPostNum'), value: messageReply.successPostNum, color: getColor() },
    { name: toLowerLine('failPostNum'), value: messageReply.failPostNum, color: getColor() },
    { name: toLowerLine('successPostIds'), value: messageReply.successPostIds, color: getColor() },
    { name: toLowerLine('failPostIds'), value: messageReply.failPostIds, color: getColor() },
  ]
}

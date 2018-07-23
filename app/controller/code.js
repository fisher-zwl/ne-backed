const {Code} = require('../model')
const common = require('../helper/commom')
const Joi = require('joi')
const tools = require('../helper/tools')
const ERRORS = require('../helper/errors')
const xlsx = require('node-xlsx');
const fs = require('fs')
const moment = require('moment')


module.exports.list = async(req, res) => {

  try {
    let params = common.validateParams(res, Object.assign(req.query, req.body), {
      page: Joi.number(),
      size: Joi.number(),
      startDate: Joi.string().allow(''),
      endDate: Joi.string().allow(''),
      search: Joi.string().allow(''),
      status: Joi.number().allow('')
    })
    if (params.STOP) return

    let page = parseInt(params.page) || 1,
      size = parseInt(params.size) || 10;
    let where = {}
    if (params.startDate && params.startDate) {
      where = Object.assign(where, {createdAt: {$between: [new Date(params.startDate), new Date(params.endDate)]}})
    }
    if (params.status) {

      where = Object.assign(where, {status: params.status})
    }
    let p=parseInt(params.status)

    if(p==0){
      where = Object.assign(where, {status: params.status})
    }
    if (params.search) {
      where = Object.assign(where, {code: {'$like': `%${params.search}%`}})
    }
    let codes = await Code.findAndCount({
      where: where,
      limit: size,
      offset: size * (page - 1),
      order: [['createdAt', 'DESC']]
    })

    res.send(common.response({data: codes}))
  } catch (e) {
    console.error(e)
  }
}

const createNumber = () => {
  let arra = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W', 'X', 'Y', 'Z']
  var index = Math.floor(Math.random() * arra.length)
  return arra.splice(index, 1).join('')
}
const create6 = () => {
  let result = ''
  for (let i = 0; i < 6; i++) {
    result = result + createNumber()
  }
  return result
}
const createCode = () => {
  return new Promise((resolve, reject) => {
    const createCodeRe = async() => {
      try {
        let r = await Code.create({code: create6()})
        resolve()
      } catch (e) {
        createCodeRe()
      }
    }
    createCodeRe()
  })
}
const test = async() => {
  for (let i = 0; i < 1000; i++) {
    console.info(i)
    try {
      await createCode()
    } catch (e) {
      console.error(e)
    }
  }
  console.info('finish')
}
module.exports.createCode = async(req, res) => {
  test()
  res.send({code: 0})
}

module.exports.exportXlsx = async(req, res) => {
  const size = 5000;
  const page = 20
  let codes = await Code.findAll(
    {
      where: {},
      limit: size,
      offset: size * (page - 1),
      order: [['createdAt', 'DESC']]
    }
  )
  codes = JSON.parse(JSON.stringify(codes))
  let dowloadCodes = codes.map((item, index) => index == 0 ? ['序号', '兑换码', '创建时间'] : [index + 1, item.code, moment(item.createdAt).format('YYYY/MM/DD HH:mm:ss')])

  var buffer = xlsx.build([{name: "mySheetName", data: dowloadCodes}]);
  const fileName = `public/code_${moment(new Date()).format('YYYY.MM.DD.HH.mm.ss')}.xlsx`
  await fs.writeFileSync(fileName, buffer, 'binary');
  //res.download(fileName);
  res.send('success')
}
module.exports.vertify = async(req, res) => {
  let params = common.validateParams(res, Object.assign(req.query, req.body), {
    code: Joi.string().required()
  })
  if (params.STOP) return
  let code = await Code.findOne({
    where: {
      code: params.code,
      $or: [{status: 0}, {status: 2}]
    }
  })
  if (code == null) {
    res.send(common.response({data: {code:-1}}))
  }else {
    res.send(common.response({data: {code:-0}}))
  }
}
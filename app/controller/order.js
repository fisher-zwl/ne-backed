const {Info, Code, Product} = require('../model')
const common = require('../helper/commom')
const Joi = require('joi')
const ERRORS = require('../helper/errors')
const db = require('../init')
const Sequelize = require('sequelize')
const moment = require('moment')
const xlsx = require('node-xlsx')
const fs = require('fs')

module.exports.list = async(req, res) => {

  try {
    let params = common.validateParams(res, req.query, {
      page: Joi.number(),
      size: Joi.number(),
      status: Joi.number().allow(''),
      productionId: Joi.number().allow('')
    })
    let count = 0
    let order = []
    if (params.STOP) return

    let page = parseInt(params.page) || 1,
      size = parseInt(params.size) || 10;
    let offset = (page - 1) * size
    if (params.productionId) {
      const handleIncludeSql = (model, Tags, throwModels, throwTagNameId, isCount) => {
        let statusSql = params.status ? `and status=${params.status} ` : ''
        let count = '*'
        if (isCount) {
          count = 'count(*)'
        }
        let existsSql = Tags.map(item => `exists (select * from ${throwModels} where ${model}Id = ${model}.id and ${throwTagNameId}=${item.id} ) `)
        let sql = `select ${count} from ${model} where ${existsSql.join(' and ')} ` + statusSql
        return sql
      }
      let sql = handleIncludeSql('info', [{id: params.productionId}], 'info_product', 'productId')
      sql = sql + `order by createdAt desc limit ${offset},${size}`
      let countSql = handleIncludeSql('info', [{id: 1}], 'info_product', 'productId', true)
      let ord = await db.db.query(sql, {type: Sequelize.QueryTypes.SELECT})
      let c = await db.db.query(countSql, {type: Sequelize.QueryTypes.SELECT})
      count = c[0]['count(*)']
      order = await Info.findAll({
        where: {
          id: ord.map(item => item.id)
        },
        order: [['createdAt', 'DESC']],
        include: [{model: Code}, {model: Product}]
      })
    } else {
      let where = {}
      if (typeof (params.status) != 'undefined'&&typeof (params.status)!='string') {
        where.status = params.status
      }
      order = await Info.findAll({
        where: where,
        order: [['createdAt', 'DESC']],
        include: [{model: Code}, {model: Product}]
      })
      count = await Info.count({
        where: where,
        limit: size,
        offset: size * (page - 1),
      })
    }

    res.send(common.response({data: {count: count, rows: order}}))
  } catch (e) {
    console.error(e)
  }
}
module.exports.changeStatus = async(req, res) => {

  let params = common.validateParams(res, req.body, {
    status: Joi.number().required(),
    id: Joi.array().required()
  })
  let order = await Info.update({status: params.status}, {
    where: {
      id: params.id
    }
  })
  res.send(common.response({data: order}))
}

module.exports.create = async(req, res) => {
  try {

    let params = common.validateParams(res, req.body, {
      oneCode: Joi.string().required(),
      twoCode: Joi.string().required(),
      address: Joi.string().required(),
      mobile: Joi.number().required(),
      productId: Joi.number().required(),
      name: Joi.string().required()
    })
    if (params.STOP) return
    let oneCode = await Code.findOne({
      where: {
        code: params.oneCode,
        $or: [{status: 0}, {status: 2}]
      }
    })
    let towCode = await Code.findOne({
      where: {
        code: params.twoCode,
        $or: [{status: 0}, {status: 2}]
      }
    })
    if (oneCode == null || towCode == null) {
      res.send(ERRORS.CODE_ERRO)
      return
    }
    await Code.update({
      status: 1
    }, {
      where: {
        code: params.oneCode,
        $or: [{status: 0}, {status: 2}]
      }
    })
    let product = await Product.findOne({
      where: {
        id: params.productId
      }
    })
    if (product == null) {
      res.send(ERRORS.STATUS_ERRO)
      return
    }
    await Code.update({
      status: 1
    }, {
      where: {
        code: params.twoCode,
        $or: [{status: 0}, {status: 2}]
      }
    })

    let order = await Info.create({
      mobile: params.mobile,
      address: params.address,
      name: params.name,
      status: 0
    })
    order.addProducts([product])
    let order_code = await order.addCodes([oneCode, towCode])
    res.send(common.response({data: order_code}))
  } catch (e) {
    console.error(e)
  }
}
module.exports.exportsFile = async(req, res) => {
  let params = common.validateParams(res, req.query, {
    ids: Joi.string().required()
  })
  if (params.STOP) return
  params.ids = params.ids.split(',').map(item => parseInt(item))
  console.info(params.ids)
  let info = await Info.findAll({
    where: {
      id: params.ids
    },
    include: [{model: Code}, {model: Product}]
  })
  info = JSON.parse(JSON.stringify(info))
  let dowloadCodes = info.map((item, index) =>
    [index + 1, item.name, item.mobile,
      item.address,
      item.codes.map(each => each.code).join(','),
      item.products.map(each => each.name).join(','),
      item.status == 0 ? '未发货' : item.status == 1 ? '发货中' : '已发货',
      moment(item.createdAt).format('YYYY/MM/DD HH:mm:ss')])
  dowloadCodes = [['序号', '姓名', '电话号码', '地址', '兑换码', '奖品', '发货状态', '创建时间'], ...dowloadCodes]
  var buffer = xlsx.build([{name: "mySheetName", data: dowloadCodes}]);
  const fileName = `public/订单_${moment(new Date()).format('YYYY.MM.DD.HH.mm.ss')}.xlsx`
  await fs.writeFileSync(fileName, buffer, 'binary');
  res.download(fileName);
}

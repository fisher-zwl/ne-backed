const {Product, Info} = require('../model')
const common = require('../helper/commom')
const Joi = require('joi')
const ERRORS = require('../helper/errors')
module.exports.list = async(req, res) => {
  let params = common.validateParams(res, req.query, {
    page: Joi.number(),
    size: Joi.number(),
    isDel:Joi.number()
  })
  if (params.STOP) return

  let page = parseInt(params.page) || 1,
    size = parseInt(params.size) || 10;
  let where={}
  if(typeof (params.isDel)!='undefined'){
    where.isDel=params.isDel
  }
  let product = await Product.findAndCount({
    limit: size,
    offset: size * (page - 1),
    where: where,
    order: [['createdAt', 'DESC']],
  })
  res.send(common.response({data: product}))
}
module.exports.create = async(req, res) => {
  let params = common.validateParams(res, req.body, {
    name: Joi.string().required()
  })
  if (params.STOP) return
  let product = await Product.create({
    name: params.name
  })
  res.send(common.response({data: product}))
}
module.exports.delete = async(req, res) => {
  let params = common.validateParams(res, Object.assign(req.body,req.query), {
    id: Joi.number().required()
  })
  if (params.STOP) return

  /*let product=await Product.destroy({
   where:{
   id:params.id
   }
   })*/
  let fProduct = await Product.findOne({
    where: {
      id: params.id
    },
    include: Info
  })
  if (fProduct == null) {
    res.send(ERRORS.OBJECT_NO_EXIST)
    return
  }
  if (fProduct.infos.length == 0) {
    await Product.destroy({
      where: {
        id: params.id
      }
    })

  } else {
    await Product.update({isDel: 1}, {where: {id: params.id}})
  }

  res.send(common.response({data: 'delete success'}))
}
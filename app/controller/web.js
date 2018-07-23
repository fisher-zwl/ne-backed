const {Info, Code,Product} = require('../model')
const common = require('../helper/commom')
const Joi = require('joi')
const ERRORS = require('../helper/errors')
const db = require('../init')
const Sequelize = require('sequelize')
module.exports.index = (req, res) => {
  console.info('....')
  res.render('html/main',
    {}
  );
}
module.exports.info = async (req, res) => {
  let product=await Product.findAll({
    where:{
      isDel:0
    }
  })
  product=JSON.parse(JSON.stringify(product))
  product=product.map((item,index)=>index==0?Object.assign(item,{active:'active'}):Object.assign(item))
  res.render('html/info',
    {data:product}
  )
}
module.exports.success = (req, res) => {
  res.render('html/success',
    {}
  )
}
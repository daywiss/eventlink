const lodash = require('lodash')
const Handler = require('./handler')
module.exports = (object,cb,channel='message') => {

  function request(path,args,method){
    return {
      type:'request',
      path,
      arguments:args,
    }
  }

  function response(path,args,result,method){
    return {
      type:'response',
      path,
      arguments:args,
      result,
    }
  }

  function error(path,args,err){
    return {
      type:'error',
      path,
      arguments:args,
      result:err,
    }
  }

  function async(path,args,result){
    return {
      type:'async',
      path,
      arguments:args,
      result,
    }
  }

  function isPromise(obj){
    return lodash.isFunction(obj.then)
    // return Promise.resolve(obj) === obj
  }

  function tapPromise(promise,path,args){
    return async ()=>{
      try{
        const result = await promise
        return cb(channel,response(path,args,result))
      }catch(e){
        return cb(channel,error(path,args,e))
        throw e
      }
    }
  }

  async function tapResponse(path,args,response){
    const result = await response
    cb(channel,response(path,args,result))
  }

  function proxyResponse(path,args,result,target){
    // console.log('proxy response',path,args,result)
    // if(isPromise(result)){
    //   console.log('promise found',path)
    //   return tapPromise(result,path,args)
    // }
    if(lodash.isFunction(result)){
      result = result.bind(target)
    }
    if(lodash.isObject(result)){
      // console.log('object found',path,args,result)
      cb(channel,response(path,args,result))
      return new Proxy(result,Handlers(path,cb))
    }
    // console.log('path',args,'result')
    return cb(channel,response(path,args,result))
  }

  function handleEvent(type,path,method,args,result,target){
    console.log('handle',type,method,path,result)
    switch(type){
      case 'request':
        cb(channel,request(path,args,result,target))
        break
      case 'response':
        cb(channel,response(path,args,result,target))
        // return proxyResponse(path,args,result,target)
        break
      case 'async':
        cb(channel,async(path,args,result,target))
        // return proxyResponse(path,args,result,target)
        break
      case 'error':
        cb(channel,error(path,args,result,target))
        break
      default:
        console.log('unknown event',...arguments)
    }
    return result
  }

  return new Proxy(object,Handler([],handleEvent))
}

const test = require('tape')
const Eventify = require('.')
const Events = require('events')
const lodash = require('lodash')

let eventify

const log = (...args)=>{
  console.log(...args)
  return args[0]
}

// const methods = lodash.merge(new Events(),{
const methods = {
  echo:x=>x,
  echoAsync:async x=>x,
  nested:{
    echo:x=>x,
    primitive:1
  },
  errorSync:x=>{throw new Error(x)},
  errorAsync:async x=>{ throw new Error(x) },
  events: new Events(),
  cb: (x,cb)=>cb(x),
  curry: x=>y=>x+y,
}

const awaitMessage = events => (type='response') => match => {
  return new Promise(res=>{
    events.on('message', sub = x=>{
      if(x.type != type) return
      switch(type){
        case 'response':
          var result = x.result
          break
        case 'error':
          var result = x.result.message
          break
        case 'async':
          console.log('async',x)
          var [result] = x.arguments
          if(result.message) result = result.message
          break
        default:
          throw new Error('unknown response type: ' + type)
      }
      console.log('message',type,result)
      if(result !== match) return
      events.removeListener('message',sub)
      res(result)
    })
  })
}


// function awaitError(e,result){
//   return new Promise(res=>{
//     e.on('message',sub = (x) =>{
//       if(x.type != 'error') return
//       console.log('got error',x.result.message,result)
//       if(x.result.message != result) return
//       e.removeListener('message',sub)
//       res(x.result)
//     })
//   })
// }

// function awaitMessage(e,result){
//   return new Promise(res=>{
//     e.on('message',sub = (x) =>{
//       console.log('message',x)
//       if(x.result != result) return
//       e.removeListener('message',sub)
//       res(x.result)
//     })
//   })
// }

// function awaitAsyncMessage(e,result){
//   return new Promise(res=>{
//     e.on('message',sub = (x) =>{
//       if(x.type != 'async') return
//       console.log('async message',x)
//       const [arg] = x.arguments
//       if(arg != result) return
//       e.removeListener('message',sub)
//       res(arg)
//     })
//   })
// }
test('asyncTest',async t=>{ 
  const handler = {
    get:(t,p,r)=>{
      const result = Reflect.get(t,p,r)
      // if(lodash.isFunction(result)){
      //   result.bind(t)
      // }
      if(lodash.isObject(result)){
        // console.log('got object',p)
        return new Proxy(result.bind(t),handler)
      }
      return result
    },
    apply:(t,c,a)=>{
      // console.log('apply')
      const result = Reflect.apply(t,c,a)
      // if(lodash.isFunction(result)){
      //   result.bind(c)
      // }
      if(lodash.isObject(result)){
        // console.log('apply object')
        return new Proxy(result,handler)
      }
      return result
    }
  }
  const test = new Proxy({x:async (x)=>x},handler)
  try{
    let result = await test.x('test')
    t.equal(result,'test')
    result = await test.x('test')
    t.equal(result,'test')

  }catch(e){
    console.log(e)
  }

  t.end()
})

test('proxy',t=>{
  const events = new Events()
  const Proxy = require('./proxy')
  const awaitError = awaitMessage(events)('error')
  const awaitAsync = awaitMessage(events)('async')
  const awaitResponse = awaitMessage(events)()
  const awaitAsyncError= awaitMessage(events)('async')
  let proxy
  t.test('init',t=>{
    proxy = Proxy(methods,events.emit.bind(events))
    t.end()
  })
  t.test('nested primitive',t=>{
    const result = proxy.nested.primitive
    t.equal(result,methods.nested.primitive)
    t.end()
  })
  t.test('echo',t=>{
    const result = proxy.echo('hello')
    console.log(result)
    t.equal(result,'hello')
    t.end()
  })
  t.test('curry',t=>{
    const result = proxy.curry(1)(1)
    t.equal(result,2)
    t.end()
  })
  // t.test('root method event',t=>{
  //   methods.once('test',x=>{
  //     console.log('root',x)
  //     t.end()
  //   })       
  //   methods.emit('test','root')
  // })
  t.test('nested method event',t=>{
    methods.events.once('test',x=>{
      console.log('nested',x)
      t.end()
    })       
    methods.events.emit('test','nested')
  })
  t.test('eventlink event',t=>{
    // console.log(eventify.events)
    proxy.events.once('test',x=>{
      // console.log('eventify',x)
      t.end()
    })
    proxy.events.emit('test','eventify event')
  })
  t.test('echoAsync',async t=>{
    awaitAsync('test').then(x=>{
      t.end()
    })
    const result = await proxy.echoAsync('test')
    t.equal(result,'test')
  })
  t.test('nested.echo',async t=>{
    awaitResponse('test').then(x=>{
      t.ok(x)
      t.end()
    })
    const result = await proxy.nested.echo('test')
    t.equal(result,'test')
  })
  t.test('error',t=>{
    awaitError('test').then(x=>{
      t.ok(x)
      t.end()
    })
    try{
      proxy.errorSync('test')
    }catch(e){
      // console.log('error caught',e)
      t.ok(e)
    }
  })
  t.test('errorAsync',async t=>{
    awaitAsyncError('test').then(x=>{
      t.ok(x)
      t.end()
    })
    try{
      const result = await proxy.errorAsync('test')
    }catch(e){
      t.ok(e)
    }
  })
})

// test('eventlink',t=>{
//   t.test('init',t=>{
//     eventify = Eventify(methods)
//     t.ok(eventify)
//     t.ok(eventify.events)
//     t.ok(eventify.methods)
//     t.end()
//   })
//   t.test('root method event',t=>{
//     methods.once('test',x=>{
//       console.log('root',x)
//       t.end()
//     })       
//     methods.emit('test','root')
//   })
//   t.test('nested method event',t=>{
//     methods.events.once('test',x=>{
//       console.log('nested',x)
//       t.end()
//     })       
//     methods.events.emit('test','nested')
//   })
//   t.test('eventify event',t=>{
//     // console.log(eventify.events)
//     eventify.methods.events.once('test',x=>{
//       // console.log('eventify',x)
//       t.end()
//     })
//     eventify.methods.events.emit('test','eventify event')
//   })
//   t.test('echo',t=>{
//     awaitMessage(eventify.events,'response').then(x=>{
//       t.ok(x)
//       t.end()
//     })
//     // methods.on('message',console.log)
//     // methods.events.on('message',console.log)
//     const result = eventify.methods.echo('test')
//     t.equal(result,'test')
//   })
//   t.test('echoAsync',async t=>{
//     awaitMessage(eventify.events,'response').then(x=>{
//       t.ok(x)
//       t.end()
//     })
//     const result = await eventify.methods.echoAsync('test')
//     t.equal(result,'test')
//   })
//   t.test('nested.echo',async t=>{
//     awaitMessage(eventify.events,'response').then(x=>{
//       t.ok(x)
//       t.end()
//     })
//     const result = await eventify.methods.nested.echo('test')
//     t.equal(result,'test')
//   })
//   t.test('error',t=>{
//     awaitMessage(eventify.events,'error').then(x=>{
//       t.ok(x)
//       t.end()
//     })
//     try{
//       eventify.methods.error('test')
//     }catch(e){
//       t.ok(e)
//     }
//   })
//   t.test('errorAsync',async t=>{
//     awaitMessage(eventify.events,'error').then(x=>{
//       t.ok(x)
//       t.end()
//     })
//     try{
//       const result = await eventify.methods.errorAsync('test')
//     }catch(e){
//       t.ok(e)
//     }
//   })
//   t.test('primitive',t=>{
//     const result = eventify.methods.nested.primitive
//     t.equal(result,methods.nested.primitive)
//     t.end()
//   })
//   t.test('callback',t=>{
//     awaitMessage(eventify.events,'event').then(x=>{
//       console.log(x)
//       t.ok(x)
//       t.end()
//     })
//     eventify.methods.cb('test',x=>{
//       console.log(x)
//     })
//   })
//   t.test('event',t=>{
//     awaitMessage(eventify.events,'event').then(x=>{
//       console.log(x)
//       t.ok(x)
//       t.end()
//     })
//     eventify.methods.on('test',x=>{
//       console.log(x)
//     })
//     eventify.methods.emit('test','test')
//   })
//   t.test('nested event',t=>{
//     awaitMessage(eventify.events,'event').then(x=>{
//       console.log(x)
//       t.ok(x)
//       t.end()
//     })
//     eventify.methods.events.on('test',x=>{
//       console.log(x)
//     })
//     eventify.methods.events.emit('test','test')
//   })
// })

const debug = require('debug')('solve')
const _ = require('lodash')
const gridUtils = require('./grid-utils')
const getCacheServersByEndpoint = require('./get-cache-servers-by-endpoint')
const requestsSortedByLatencySaved = require('./requests-sorted-by-latency-saved')

module.exports = function solve (problem) {
  const requestByPopularity = requestsSortedByLatencySaved(problem)//_.orderBy(problem.requests, ['popularity'], ['desc'])

  const cacheServers = _.uniqBy(
    _.map(
      _.flatMap(problem.endpoints, endpoint => endpoint.cacheServers),
      ({id}) => ({ id, capacity: problem.cacheServerCapacity, videos: [] })
    ),
    'id'
  )

  const endpointsCachedVideos = {}
  problem.endpoints.forEach(endpoint => {
    endpointsCachedVideos[endpoint.index] = []
  })

  const videosLatencyByEnpoint = _.mapValues(
    _.groupBy(problem.requests, 'endpoint'),
    requests => _.mapValues(
      _.keyBy(requests, 'video'),
      request => _.find(problem.endpoints, { index: request.endpoint }).datacenterLatency
    )
  )

  let requestsWithCacheServer = _.map(requestByPopularity, request => {
    const video = _.find(problem.videos, {index: request.video})

    let cacheServersByEndPoint = getCacheServersByEndpoint(problem, request.endpoint)
    cacheServersByEndPoint = _.filter(cacheServersByEndPoint, ({ id, latency }) => {
      const cacheServer = _.find(cacheServers, {id})
      return cacheServer &&
        cacheServer.capacity >= video.size &&
        !_.includes(cacheServer.videos, video.index) &&
        !_.includes(endpointsCachedVideos[request.endpoint], video.index) &&
        latency < videosLatencyByEnpoint[request.endpoint][video.index]
    })
    cacheServersByEndPoint = _.sortBy(cacheServersByEndPoint, 'latency')

    const cacheServer = _.first(cacheServersByEndPoint)
    if (cacheServer) {
      const cacheServer2 = _.find(cacheServers, {id: cacheServer.id})
      cacheServer2.capacity -= video.size
      cacheServer2.videos.push(video.index)
      endpointsCachedVideos[request.endpoint].push(video.index)
      return {
        request,
        cacheServer
      }
    }
  })
  requestsWithCacheServer = _.compact(requestsWithCacheServer)
  const requestsByCacheServer = _.groupBy(requestsWithCacheServer, 'cacheServer.id')
  const solution = _.map(requestsByCacheServer, (requests, id) => ({
    id,
    videos: _.map(requests, request => request.request.video)
  }))
  return solution
}

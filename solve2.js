const debug = require('debug')('solve')
const _ = require('lodash')

module.exports = function solve (problem) {

}

function buildInitialProblemState (problem) {
  const {cacheServerCapacity, videos, endpoints, requests} = _.cloneDeep(problem)
  const ncacheServers = _(endpoints).flatMap('cacheServers').uniqBy('id').size()
  return {
    caches: _.times(ncacheServers, i => ({
      remainingCapacity: cacheServerCapacity
    })),
    videos,
    endpoints: endpoints.map(endpoint => ({
      index: endpoint.index,
      latency: endpoint.datacenterLatency,
      availableCaches: endpoint.cacheServers,
      fasterCaches: _(endpoint.cacheServers)
        .filter(cache => cache.latency < endpoint.datacenterLatency)
        .sortBy('latency')
        .value()
    })),
    requests
  }
}

function selectNextCacheCommand (problemState) {
  _(problemState.requests)
    .flatMap(request => {
      const endpoint = problemState.endpoints[request.endpoint]
      const video = problemState.videos[request.video]
      const bestCache = _.find(endpoint.fasterCaches, cache => cache.remainingCapacity >= video.size)
    })
}

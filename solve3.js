const debug = require('debug')('solve')
const _ = require('lodash')

module.exports = function solve (problem) {
  // const videos = _.flatMap(problem.videos, video => {
  //   const anyRequest = _.find(problem.requests, {video: video.index})
  //   if (!anyRequest) return []
  //   const anyEndpoint = problem.endpoints[anyRequest.endpoint]
  //   const anyCache = anyEndpoint.cacheServers[0]
  //   if (!anyCache) return []
  //   const savedLatency = (anyEndpoint.datacenterLatency - anyCache.latency) * anyRequest.popularity
  //   return [Object.assign({}, video, {score: savedLatency})]
  // })
  // x(problem.cacheServerCapacity, videos)

  // const caches = _(problem.endpoints)
  //   .map(endpoint => [endpoint.index, _.map(endpoint.cacheServers, 'id')])
  //   .flatMap(([index, cacheIds]) => _.map(cacheIds, id => [id, index]))
  //   .groupBy(([cacheId, index]) => cacheId)
  //   .mapValues(group => _.map(group, ([cacheId, indices]) => indices))
  //   .mapValues(indices => _.filter(problem.requests, request => _.includes(indices, request.endpoint)))
  //   .mapValues(requests => _.map(requests, request => problem.videos[request.video]))

  const requestsByEndpoint = _.groupBy(problem.requests, 'endpoint')
  const c = _.transform(problem.endpoints, (caches, endpoint) => {
    const videos = _.map(requestsByEndpoint[endpoint.index], request => {
      const video = problem.videos[request.video]
      const score = latency => (endpoint.datacenterLatency - latency) * request.popularity
      return {id: video.index, size: video.size, score}
    })
    _.forEach(endpoint.cacheServers, cache => {
      caches[cache.id] = caches[cache.id] || {id: cache.id, capacity: problem.cacheServerCapacity, videos: []}
      caches[cache.id].videos.push(..._.map(videos, video => ({id: video.id, size: video.size, score: video.score(cache.latency)}))) // should uniq!!
    })
    // return caches.concat(_.map(endpoint.cacheServers, ({id, latency}) => ({id, latency, endpoint: endpoint.index})))
  }, {})
  debug(c)
  _.forEach(c, cache => x(cache.capacity, cache.videos))
  process.exit()
}

function x (capacity, videos) {
  // const scores = [0]
  // for (let i = 0; i < scores.length; i++) {
  //   let max = 0
  //   for (let j = 0; j < videos.length; j++) {
  //     const video = videos[j]
  //     if (video.size > i) continue
  //     const score = scores[i - video.size] + video.score
  //     if (score > max) max = score
  //   }
  //   scores[i] = max
  // }

  const refs = [null]
  const scores = [0]
  _.times(capacity + 1, i => {
    const bestVideo = _(videos)
      .filter(video => video.size <= i)
      .map(video => ({id: video.id, size: video.size, score: scores[i - video.size] + video.score}))
      .maxBy('score')
    scores[i] = _.get(bestVideo, 'score', scores[i])
    refs[i] = bestVideo.size
  })

  const selectedVideos = []
  let j = refs.length - 1
  while (j > 0) {

  }

  // const scores = _.reduce(_.times(capacity + 1, i => 0), (scores, score, i) => {
  //   scores[i] = _(videos)
  //     .filter(video => video.size <= i)
  //     .map(video => scores[i - video.size] + video.score)
  //     .max() || score
  //   return scores
  // })

  debug('score', scores[capacity])
}

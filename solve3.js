const debug = require('debug')('solve')
const _ = require('lodash')
const assert = require('assert')

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

  // const requestsByEndpoint = _.groupBy(problem.requests, 'endpoint')
  // const c = _.transform(problem.endpoints, (caches, endpoint) => {
  //   const videos = _.map(requestsByEndpoint[endpoint.index], request => {
  //     const video = problem.videos[request.video]
  //     const score = latency => (endpoint.datacenterLatency - latency) * request.popularity
  //     return {id: video.index, size: video.size, score}
  //   })
  //   _.forEach(endpoint.cacheServers, cache => {
  //     caches[cache.id] = caches[cache.id] || {id: cache.id, capacity: problem.cacheServerCapacity, videos: []}
  //     caches[cache.id].videos.push(..._.map(videos, video => ({id: video.id, size: video.size, score: video.score(cache.latency)}))) // should uniq!!
  //   })
  //   // return caches.concat(_.map(endpoint.cacheServers, ({id, latency}) => ({id, latency, endpoint: endpoint.index})))
  // }, {})
  // // debug(c)
  // debug('precalculations end')
  // return _(c)
  //   .mapValues(cache => y(cache.capacity, cache.videos))
  //   .map((solution, id) => ({id, videos: _.map(solution.cachedVideos, 'id')}))
  //   .value()
  debug('precalculate')
  const {videos, scores, impacted} = precalculate(problem)
  debug('precalculate end')
  return _.times(problem.ncacheServers, id => ({id, videos: z(id, problem.cacheServerCapacity, videos, scores[id])}))
  // process.exit()
}

/**
 * I want
 * - video -> size
 * - cache, video -> score
 * - cache -> caches impacted by this cache changing
 */
function precalculate (problem) {
  const videos = _.map(problem.videos, 'size')
  assert(problem.ncacheServers)
  const impacted = Array.from(Array(problem.ncacheServers), () => new Set())
  const scores = Array.from(Array(problem.ncacheServers), () => ({}))
  _.forEach(problem.requests, request => {
    const endpoint = problem.endpoints[request.endpoint]
    const caches = _.map(endpoint.cacheServers, 'id')
    _.forEach(endpoint.cacheServers, cache => {
      _.forEach(caches, id => impacted[cache.id].add(id))
      scores[cache.id][request.video] = (endpoint.datacenterLatency - cache.latency) * request.popularity
    })
  })
  return {videos, scores, impacted}
}

function z (cacheId, capacity, videoSizes, videoScores) {
  debug('initializing', cacheId)
  const videos = [Array(videoSizes.length).fill(true)]
  const scores = {0: 0}
  _.forEach(videoScores, (score, id) => {
    const size = videoSizes[id]
    scores[size] = scores[size] || 0
    videos[size] = videos[size] || Array(videoSizes.length).fill(true)
    if (scores[size] < videoScores[id]) {
      scores[size] = videoScores[id]
      videos[size].fill(true)
      videos[size][id] = false
    }
  })
  debug('iterating')
  _.times(capacity + 1, i => {
    if (!videos[i]) return
    // debug('iteration', i)
    const videosLeft = videos[i]
    const [bestVideoId, bestScore] = _(videosLeft)
      .map((left, id) => {
        if (left && i + videoSizes[id] <= capacity) return [id, scores[i] + videoScores[id]]
      })
      .maxBy(1) || []
    if (bestVideoId === undefined) return
    videos[i + videoSizes[bestVideoId]] = videos[i + videoSizes[bestVideoId]] || Array(videoSizes.length).fill(true)
    videos[i + videoSizes[bestVideoId]][bestVideoId] = false
    scores[i + videoSizes[bestVideoId]] = bestScore
    // selectedVideos.push(bestVideoId)
  })
  debug('iterating end')
  const bestState = _(scores).map((score, size) => [size, score]).maxBy(1)[0]
  const selectedVideos = _(videos[bestState]).map((left, id) => left ? null : id).reject(id => id === null).value()
  // debug(videoSizes, videoScores, scores, selectedVideos)
  return selectedVideos
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
      .map(video => ({
        id: video.id,
        size: video.size,
        score: scores[i - video.size] + video.score
      }))
      .maxBy('score')
    scores[i] = _.get(bestVideo, 'score', scores[i])
    refs[i] = bestVideo
    videos = _.without(videos, bestVideo)
  })

  const selectedVideos = [refs[refs.length - 1]]
  let j = refs.length - 1
  while (j > 0) {
    j = refs[j - selectedVideos[0].size]
    selectedVideos.unshift(refs[j])
  }

  // const scores = _.reduce(_.times(capacity + 1, i => 0), (scores, score, i) => {
  //   scores[i] = _(videos)
  //     .filter(video => video.size <= i)
  //     .map(video => scores[i - video.size] + video.score)
  //     .max() || score
  //   return scores
  // })

  debug('selectedVideos', selectedVideos)
}

function y (capacity, videos) {
  debug('nvideos', videos.length)
  debug('finding smallest video')
  const smallestVideo = _.minBy(videos, 'size')
  debug('filtering videos')
  videos = _(videos)
    .filter(video => video.size <= capacity)
    .keyBy('id')
    .value()
  debug('initializing states')
  const initialState = {
    cachedVideos: [],
    uncachedVideos: videos,
    score: 0
  }
  const states = {0: initialState}
  _.forEach(videos, video => {
    states[video.size] = {
      cachedVideos: [video],
      uncachedVideos: _.omit(videos, video.id),
      score: video.score
    }
  })
  debug('starting iterations')
  _.times(capacity + 1 - smallestVideo.size, i => {
    if (!states[i]) return
    debug('iteration', i)
    const {cachedVideos, uncachedVideos, score} = states[i]
    _(uncachedVideos)
      .filter(video => i + video.size <= capacity)
      .forEach(video => {
        const existingState = states[i + video.size] || {score: 0}
        const newState = {
          cachedVideos: [...cachedVideos, video],
          uncachedVideos: _.omit(uncachedVideos, video.id),
          score: score + video.score
        }
        states[i + video.size] = _.maxBy([existingState, newState], 'score')
      })
    debug('iteration', i, 'end')
  })
  // debug(states)
  debug('finding max')
  return _(states).values().maxBy('score')
}

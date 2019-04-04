/**
 * @Author zhangyi
 * @Date 2019/4/1
 */
import Events from './events'
import { getActivePage, getPrevPage } from "./utils";

let defaultParams = {}

class Tracker extends Events {

    constructor() {
        super()
        this.instance = null
        this.page = null
        this.trackConfig = null
        this.showTime = 0
    }

    /**
     * 解析埋点配置文件，转变为需要上报的数据
     * @param trackInfo
     * @param page
     * @param trackConfig
     * @returns {{name, params}}
     */
    handlerData(trackInfo, page, trackConfig) {
        const { action, args } = trackInfo
        const { index = -1 } = args

        if (action && trackConfig && trackConfig[action]) {
            const { name, params } = trackConfig[action]
            let newPrams = {}

            for(let key in params) {
                let value  = params[key] || ''

                if (/^{[\S]*}$/.test(value)) {
                    value = value.replace(/^{|}$/g, '')
                    let dataSource;
                    if (value.indexOf('page.') === 0) {
                        dataSource = page
                    } else if (value.indexOf('args.') === 0) {
                        dataSource = args
                    } else {
                        // APP引用不能提升
                        const APP = getApp()
                        dataSource = APP
                    }
                    let arr = value.split('.')

                    arr.forEach((item, idx) => {
                        if (idx > 0) {
                            if (item.indexOf('$INDEX') > 0) {
                                let itemKey = item.replace('[$INDEX]', '')
                                if (index > -1) {
                                    dataSource = dataSource[itemKey][index]
                                } else {
                                    console.warn('Tracker ')
                                }
                            } else {
                                dataSource = dataSource[item]
                            }
                        }
                    })
                    newPrams[key] = dataSource
                } else {
                    newPrams[key] = value
                }
            }
            return {
                name,
                params: newPrams
            }
        }
    }

    /**
     * 设置默认数据
     * @param params
     */
    setDefaultParams(params = {}) {
        defaultParams = Object.assign(defaultParams, params)
    }

    /**
     * 获取当前页面的埋点配置
     * @param pageRoute
     * @returns {boolean}
     */
    getTrackConfig(pageRoute = '') {
        try {
            const arr = pageRoute.split('/')
            arr[arr.length - 1] = 'trackConfig'
            const path = arr.join('/')
            // 这里需要相对路径
            return require(`../../${path}`).default;
        } catch(err) {
            console.log('err:', err)
        }
    }

    /**
     * 添加埋点监听
     */
    addTrackListener() {
        console.log('Tracker onTrack')
        this.on('track', (trackInfo = {}) => {
            this.tracking(this.handlerData(trackInfo, this.page, this.trackConfig))
        })
    }

    /**
     * 触发埋点
     * @param trackInfo
     */
    triggerTrack(trackInfo = {}) {
        this.trigger('track', trackInfo)
    }

    /**
     * 页面显示时初始化数据和上报pageView埋点
     */
    pageShow() {
        const page = getActivePage()
        if (page && page.route) {
            this.page = page
            this.trackConfig = this.getTrackConfig(this.page.route)
            let pageName = ''
            if (this.trackConfig) {
                pageName = this.trackConfig.pageName
                this.addTrackListener()
            }

            const prePageName = getPrevPage() ? getPrevPage().$PageName : ''
            this.page.$PageName = pageName
            this.showTime = +new Date()
            const trackParams = this.page.$trackParams || {}

            defaultParams = {
                ...defaultParams,
                yh_pageName: pageName,
                yh_prePageName: prePageName,
                ...trackParams
            }
            this.tracking({
                name: 'yh_pageView',
                params: trackParams
            })
        }
    }

    /**
     * 清楚数据和埋点监听，上报pageLeave埋点
     */
    pageHide() {
        const showTime = this.showTime
        const time = +new Date()
        const duration = time - showTime
        // const trackParams = this.page.$trackParams || {}

        this.tracking({
            name: 'yh_pageLeave',
            params: {
                yh_duration: duration
            }
        })
        this.clear()
    }

    /**
     * 生成最终的埋点数据
     * @param data
     */
    tracking(data = {}) {
        let { name, params } = data;

        params = Object.assign(
            defaultParams,
            params
        )
        console.log('Tracker tracking:', { name, params})
        // console.log('To do the report track data')
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new Tracker()
        }
        return this.instance
    }
}

const tracker = Tracker.getInstance()

export default tracker

let activeConnection = null;
export function setActiveConnection(conn) { activeConnection = conn; }
export function subscribeToDisaster(disasterId) {
    activeConnection?.invoke('SubscribeToDisaster', disasterId).catch(() => { });
}
export function unsubscribeFromDisaster(disasterId) {
    activeConnection?.invoke('UnsubscribeFromDisaster', disasterId).catch(() => { });
}
export function activeConnectionInvoke(method, ...args) {
    activeConnection?.invoke(method, ...args).catch(() => { });
}
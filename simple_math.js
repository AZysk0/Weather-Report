export const linearInterpolation = (t1, y1, t2, y2, t) => {
    /*
    // (t1, y1)   - first interpolation point
    // (t2, y2)   - second interpolation point
    // t          - argument for which we compute interpolated function value
    // return: y0 - linearly interpolated value of some function
    */
    if (t2 == t1) {
        return null; // or you can return y1 or y2 depending on your requirements
    }

	if (t == t1) {
		return y1;
	}
	
	if (t == t2) {
		return y2;
	}
	//console.log()

    const dt = t2 - t1;
    const dy = y2 - y1;
    const y = (t - t1) * dy / dt + y1;
    return y.toFixed(2);
}

export const fitPolynomial = (xs, ys) => {
    return;
}

/**
 * Determine the map's symmetry from globally-known data.
 * @param   {bool[][]}  passMap The full map, result of this.map.
 * @param   {bool[][]}  karbMap The Karbonite map, result of this.fuel_map.
 * @param   {bool[][]}  fuelMap The Fuel map, result of this.fuel_map.
 * @returns {bool[]}            Array length 2, representing symmetry in the [vert, horiz] form.
 */
export function checkMapSymmetry(passMap, karbMap, fuelMap) {
    return [symmetry2DVert(passMap) && symmetry2DVert(karbMap) && symmetry2DVert(fuelMap),
            symmetry2DHoriz(passMap) && symmetry2DHoriz(karbMap) && symmetry2DHoriz(fuelMap)];
}
function symmetry2DVert(arr){
    var N = arr[0].length;
    var leftFlipped = arr.map(function(row){return row.slice(0, Math.floor(N/2)).reverse()});
    var right = arr.map(function(row){return row.slice(Math.floor((N+1)/2))});
    return equal2D(leftFlipped, right);
}
function symmetry2DHoriz(arr){
    var N = arr.length;
    var topFlipped = arr.slice(0, Math.floor(N/2)).reverse();
    var bottom = arr.slice(Math.floor((N+1)/2));
    return equal2D(topFlipped, bottom);
}
function equal2D(arr1, arr2){
    for(var r = 0; r < arr1.length; r++){    
        for(var c = 0; c < arr1[0].length; c++){
            if(arr1[r][c] != arr2[r][c]){
                return false;
            }
        }
    }
    return true;
}

# uglifyjs provided by https://github.com/mishoo/UglifyJS
# files are ordered by the dependency tree
for file in grid lights_enum trains_enum draw galaxies lights mines sudoku trains
do
  uglifyjs "raw/${file}.mjs" -m toplevel --module -c --name-cache cache.json -o "static/${file}.mjs"
end

# chain_controller last and needs special 
uglifyjs raw/chain_controller.js -m "reserved=['controller', 'chain']" --module -c --name-cache cache.json -o static/chain_controller.js
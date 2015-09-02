require 'bundler/setup'
require './lib/cannot/app'
require 'digest/sha2'

# use Rack::Auth::Basic, "Restricted Area" do |username, password|
#   Digest::SHA256.hexdigest(username) == 'xxxxxxxxxxxxxx' and
#   Digest::SHA256.hexdigest(password) == 'xxxxxxxxxxxxxx'
# end

run Cannot::App

$stdout.sync = true

module Cannot
  require 'sinatra/base'
  require 'sinatra/asset_pipeline'
  require 'multi_json'
  require 'date'
  require 'tempfile'
  require 'open3'
  MultiJson.use :yajl

  class App < Sinatra::Base
    require 'sinatra/reloader' if development?

    set :assets_prefix, %w(assets vendor/assets)
    set :assets_css_compressor, :sass
    set :assets_js_compressor, :uglifier
    register Sinatra::AssetPipeline

    Tilt.register Tilt::ERBTemplate, 'html.erb'

    configure do
      set :environment, (ENV['RACK_ENV'] || :development).to_sym
      set :root, File.expand_path('./../..', File.dirname(__FILE__))
      set :app_file, File.join(settings.root, 'lib', 'cannot', 'app.rb')

      register Sinatra::Reloader if development?

      disable :run
      enable :logging
    end

    helpers do
      include Rack::Utils
      alias_method :h, :escape_html
    end

    # get '/' do
    #   @data = Dir.glob("data/data/*.json").map do |filename|
    #     filename.gsub("data/data/", "").gsub(".json", "")
    #   end

    #   erb :home
    # end

    # get '/annotate' do
    #   @data = MultiJson.load(open("data/data/#{params['name']}.json").read)
    #   @user = params['user']
    #   @name = params['name']
    #   begin
    #     @annotation = File.read("data/annotations/#{params['name']}/#{params['user']}.json").gsub("'", '\\x27')
    #   rescue Errno::ENOENT
    #     @annotation = ""
    #   end
    #   erb :annotate
    # end

    get '/' do
      erb :main
    end

    post '/open' do
      validation(params)

      @data = MultiJson.load(open("data/data/#{params['name']}.json").read)
      begin
        @annotation = MultiJson.load(open("data/annotations/#{params['name']}/#{params['user']}.json").read)
        log('OPEN', [params['name'], params['user'], @annotation.select {|d| d['done'] and not d['question']}.length, @annotation.length])
      rescue Errno::ENOENT
        @annotation = nil
        log('NEW', [params['name'], params['user'], 0, @data['data'].length])
      end
      erb :template
    end

    post '/list' do
      data = Dir.glob("data/data/*.json").sort.map do |filename|
        filename.gsub("data/data/", "").gsub(".json", "")
      end
      annotations = data.map do |d|
        Dir.glob("data/annotations/#{d}/*.json").map do |filename|
          filename.gsub("data/annotations/#{d}/", "").gsub(".json", "")
        end
      end

      content_type :json
      MultiJson.dump({'data' => data, 'annotations' => annotations})
    end

    post '/save' do
      validation(params)

      data = MultiJson.load(params['annotation'])
      log('SAVE', [params['name'], params['user'], data.select {|d| d['done'] and not d['question']}.length, data.length])

      directory = "data/annotations/#{params['name']}"
      Dir.mkdir(directory) unless File.exists?(directory)
      File.write("#{directory}/#{params['user']}.json", params['annotation'])
      200
    end

    get '/export' do
      validation(params)

      filename = params['name'] + '-' + params['user'] + '-' + (DateTime.now.strftime '%Y%m%d-%H%M%S') + '.txt'
      data = MultiJson.load(open("data/data/#{params['name']}.json").read)
      annotation = MultiJson.load(open("data/annotations/#{params['name']}/#{params['user']}.json").read)

      content_type "text/plain"
      response["Content-Disposition"] = "attachment; filename=\"#{filename}\""
      json2txt(data, annotation, true)
    end

    post '/automation' do
      validation(params)

      log('AUTO', [params['name'], params['user']])

      model = Tempfile.new('cannot-model')
      temp = Tempfile.new('cannot-txt')

      data = MultiJson.load(open("data/data/#{params['name']}.json").read)
      annotation = MultiJson.load(open("data/annotations/#{params['name']}/#{params['user']}.json").read)

      if m = /^([^.]*)\..*$/.match(params['name'])
        Dir.glob("data/data/#{m[1]}.*.json").each do |filename|
          d = MultiJson.load(open(filename).read)
          filename = filename.gsub("data/data/", "").gsub(".json", "")
          Dir.glob("data/annotations/#{filename}/*.json").each do |filename2|
            annot = MultiJson.load(open(filename2).read)
            temp.write json2txt(d, annot, true)
          end
        end
      else
        temp.write json2txt(data, annotation, true)
      end

      temp.flush
      %x[ ./bin/chunking < #{temp.path} | ./bin/crfsuite learn -m #{model.path} - ]
      temp.close
      temp.unlink

      temp = Tempfile.new('cannot-txt')
      temp.write json2txt(data, annotation, false)
      temp.flush
      tags = %x[ ./bin/chunking < #{temp.path} | ./bin/crfsuite tag -m #{model.path} - ]
      temp.close
      temp.unlink

      model.close
      # model.unlink

      tags = tags.split("\n\n")
      result = []
      i = -1
      annotation.each_with_index do |a, index|
        unless a['done'] or a['question']
          result.push({"index" => index,
                       "annotation" => tags[i += 1].split("\n").map {|x| x == '(null)' ? nil : x}})
        end
      end

      content_type :json
      MultiJson.dump(result)
    end

    get %r{^/assets/(.*)-.*\.css$} do
      # I don't want to believe this is the best way
      scss :"../assets/stylesheets/#{params[:captures].first}.css"
    end

    get %r{^/assets/(.*)-.*\.js$} do
      send_file "assets/javascripts/#{params[:captures].first}.js"
    end

    def json2txt(data, annotation, done)
      out = ''

      data['data'].zip(annotation).each do |d, a|
        next if a['done'] != done
        next if a['question']

        d['nodes'].zip(a['labels']).each do |n, l|
          out += ([n['surface']] + d['shared_features'] + n['features'] + [l]).join(' ') + "\n"
        end
        out += "\n"
      end

      out
    end

    def validation(params)
      ['user', 'name'].each do |s|
        halt 400, 'Invalid parameter' if params[s].nil? or params[s].empty? or /[^-a-zA-Z0-9_.]/.match(params[s])
      end
    end

    def log(title, s)
      line = ["#{title}:", DateTime.now.strftime('%Y-%m-%d %H:%M:%S')] + s
      puts line.join("\t")
    end
  end
end

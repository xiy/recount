require "rubygems"
require "sinatra"
require "json"
require "minuteman"
require "eventmachine"

set server: "thin", connections: []
set :public_folder, "public"

redis = Redis.new(:url => "redis://development.vm:6379/2")
set :analytics, Minuteman.new(redis: redis)

get "/" do
  redirect "index.html"
end

post "/members/:member_id/encounters/:other_id" do
  key = "#{params[:member_id]}:rate:#{params[:rating]}"
  settings.analytics.track(key, params[:other_id].to_i)
  update_all(params[:member_id])

  [200, {"Access-Control-Allow-Origin" => "*"}, '']
end

get '/stream', provides: 'text/event-stream' do
  stream :keep_open do |out|
    settings.connections << out
    out.callback { settings.connections.delete(out) }
  end
end

def publish_event(key)
  rating = key.split(":").last
  data = stats_for(key).to_json

  settings.connections.each do |out|
    out << "event: encounters:#{rating}\ndata: #{data}\n\n"
  end
end

def last_ten_minutes(key, now)
  now_splat = now.to_a
  now_splat[0] = 0
  last_clock_min = Time.utc(*now_splat)

  previous_nine_minutes = (0...9).map do |i|
    settings.analytics.minute(key, last_clock_min - (i * 60)).length
  end

  current_minute = settings.analytics.minute(key, now).length -
    previous_nine_minutes.first

  last_ten_minutes = previous_nine_minutes.unshift(current_minute)
end

def stats_for(key)
  now = Time.now.utc
  last_ten_minutes = last_ten_minutes(key, now)
  {
    "minute" => settings.analytics.minute(key).length,
    "hour" => settings.analytics.hour(key).length,
    "day" => settings.analytics.day(key).length,
    "last_ten_minutes" => last_ten_minutes,
    "timestamp" => now.iso8601
  }
end

def update_all(member_id = nil)
  if member_id
    keys = %w(yes maybe no).map do |type|
      "#{member_id}:rate:#{type}"
    end
    keys.each { |key| publish_event(key) }
  else
    analytics.events.each { |key| publish_event(key) }
  end
end

# Fake some events
EM::next_tick do
  EM::add_periodic_timer(15) do
    update_all(12318)
  end
end
